import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  "create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
);
await db.exec(readFileSync("supabase/player-social.sql", "utf8"));
await db.exec(readFileSync("supabase/social-invitations.sql", "utf8"));
const owner = crypto.randomUUID(),
  guest = crypto.randomUUID(),
  outsider = crypto.randomUUID();
for (const [id, email] of [
  [owner, "owner@example.test"],
  [guest, "guest@example.test"],
  [outsider, "outsider@example.test"],
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
const state = () => rpc("dilemma_social_state");
await as(owner);
const req = crypto.randomUUID();
const invite = await rpc("create_dilemma_invitation", [
  "friend",
  null,
  "Guest@Example.test",
  req,
]);
assert.equal(
  (
    await rpc("create_dilemma_invitation", [
      "friend",
      null,
      "guest@example.test",
      req,
    ])
  ).token,
  invite.token,
);
assert.equal((await state()).invitations.length, 1);
await as(outsider);
assert.equal((await state()).invitations.length, 0);
await assert.rejects(rpc("preview_dilemma_invitation", [invite.token]));
await assert.rejects(rpc("respond_dilemma_invitation", [invite.token, true]));
await assert.rejects(rpc("cancel_dilemma_invitation", [invite.id]));
await assert.rejects(db.query("select * from public.dilemma_invitations"));
await assert.rejects(rpc("claim_dilemma_invitation_email", [invite.id, owner]));
await as(guest);
assert.equal((await state()).invitations.length, 1);
await rpc("respond_dilemma_invitation", [invite.token, true]);
await rpc("respond_dilemma_invitation", [invite.token, true]);
assert.equal((await state()).friends[0].id, owner);
await as(owner);
assert.equal((await state()).friends[0].id, guest);
await rpc("remove_dilemma_friend", [guest]);
assert.equal((await state()).friends.length, 0);
const circleCode = await rpc("create_dilemma_circle", ["Proches"]);
const circle = (await rpc("list_dilemma_circles"))[0];
const circleInvite = await rpc("create_dilemma_invitation", [
  "circle",
  circle.id,
  null,
  crypto.randomUUID(),
]);
await as(outsider);
await assert.rejects(
  rpc("create_dilemma_invitation", [
    "circle",
    circle.id,
    null,
    crypto.randomUUID(),
  ]),
);
await as(guest);
await rpc("respond_dilemma_invitation", [circleInvite.token, true]);
assert.equal((await rpc("list_dilemma_circles"))[0].code, circleCode);
await as(outsider);
await assert.rejects(
  rpc("respond_dilemma_invitation", [circleInvite.token, true]),
);
await as(owner);
const cancelled = await rpc("create_dilemma_invitation", [
  "friend",
  null,
  null,
  crypto.randomUUID(),
]);
await rpc("cancel_dilemma_invitation", [cancelled.id]);
await as(guest);
await assert.rejects(
  rpc("respond_dilemma_invitation", [cancelled.token, true]),
);
await as(owner);
const expired = await rpc("create_dilemma_invitation", [
  "friend",
  null,
  null,
  crypto.randomUUID(),
]);
await db.exec("reset role");
await db.query(
  "update public.dilemma_invitations set expires_at=now()-interval '1 second' where id=$1",
  [expired.id],
);
await as(guest);
await assert.rejects(rpc("respond_dilemma_invitation", [expired.token, true]));
await as(owner);
const email = await rpc("create_dilemma_invitation", [
  "friend",
  null,
  "another@example.test",
  crypto.randomUUID(),
]);
await as(owner, "service_role");
const attempt = await rpc("claim_dilemma_invitation_email", [email.id, owner]);
await assert.rejects(rpc("claim_dilemma_invitation_email", [email.id, owner]));
await rpc("finish_dilemma_invitation_email", [
  email.id,
  attempt.attempt,
  false,
]);
await db.exec("reset role");
await db.query(
  "update public.dilemma_invitations set last_sent_at=now()-interval '2 minutes' where id=$1",
  [email.id],
);
await as(owner, "service_role");
assert.equal(
  (await rpc("claim_dilemma_invitation_email", [email.id, owner])).attempt,
  attempt.attempt,
);
await as(owner, "anon");
await assert.rejects(rpc("dilemma_social_state"));
await db.close();
console.log(
  "Social SQL passed: acceptance, email binding, privacy, links, cancellation, expiry, retries and email permissions.",
);
