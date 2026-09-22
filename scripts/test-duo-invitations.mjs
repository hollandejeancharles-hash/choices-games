import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  "create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
);
await db.exec(readFileSync("supabase/player-social.sql", "utf8"));
await db.exec(readFileSync("supabase/social-invitations.sql", "utf8"));
await db.exec(readFileSync("supabase/duo-predictions.sql", "utf8"));
await db.exec(readFileSync("supabase/duo-invitations.sql", "utf8"));
await db.exec(
  readFileSync(
    "supabase/migrations/20260922220000_deferred_duo_answers.sql",
    "utf8",
  ),
);
const owner = crypto.randomUUID(),
  friend = crypto.randomUUID(),
  outsider = crypto.randomUUID();
for (const [id, email] of [
  [owner, "owner@example.test"],
  [friend, "friend@example.test"],
  [outsider, "outside@example.test"],
])
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [id, email],
  );
const as = async (id, role = "authenticated") => {
  await db.exec("set role " + role);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
};
const rpc = async (name, args = []) =>
  (
    await db.query(
      "select public." +
        name +
        "(" +
        args.map((_, i) => "$" + (i + 1)).join(",") +
        ") as data",
      args,
    )
  ).rows[0].data;
await as(owner);
await db.exec("reset role");
await db.query(
  "insert into public.dilemma_friendships(user_a,user_b) values(least($1::uuid,$2::uuid),greatest($1::uuid,$2::uuid))",
  [owner, friend],
);
await as(owner);
const code = await rpc("create_dilemma_duel_v3", [
  JSON.stringify(["a", "b", "c", "d", "e"]),
  null,
]);
const invite = await rpc("create_dilemma_duel_invitation", [
  code,
  friend,
  null,
]);
assert.equal(invite.recipientFound, true);
const outgoing = await rpc("list_dilemma_duos");
assert.equal(outgoing[0].code, code);
assert.equal(outgoing[0].mineAnswered, false);
await as(owner, "service_role");
const mail = await rpc("claim_dilemma_duel_email", [invite.id, owner]);
assert.equal(mail.email, "friend@example.test");
assert.equal(mail.code, code);
await as(friend);
const incoming = await rpc("list_dilemma_duos");
assert.equal(incoming[0].code, code);
assert.equal(incoming[0].invited, true);
assert.equal(incoming[0].mineAnswered, false);
let state = await rpc("answer_dilemma_duel_v3", [
  code,
  JSON.stringify([1, 0, 1, 0, 1]),
  JSON.stringify([0, 0, 1, 1, 0]),
]);
assert.equal(state.complete, false);
assert.equal(state.mineAnswered, true);
assert.equal(state.partnerAnswered, false);
await as(owner);
state = await rpc("read_dilemma_duel", [code]);
assert.equal(state.complete, false);
assert.equal(state.mineAnswered, false);
assert.equal(state.partnerAnswered, true);
state = await rpc("answer_dilemma_duel_v3", [
  code,
  JSON.stringify([0, 1, 0, 1, 0]),
  JSON.stringify([1, 1, 0, 0, 1]),
]);
assert.equal(state.complete, true);
assert.equal(state.ownerAnswers.length, 5);
assert.equal(state.guestAnswers.length, 5);
await as(outsider);
assert.deepEqual(await rpc("list_dilemma_duos"), []);
await db.close();
console.log(
  "Duo invitations passed: friend validation, account notification, privacy and trusted email delivery.",
);
