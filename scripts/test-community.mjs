import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
);
await db.exec(readFileSync("supabase/multiplayer.sql", "utf8"));
await db.exec(readFileSync("supabase/community.sql", "utf8"));
const admin = crypto.randomUUID();
await db.query("insert into auth.users values($1)", [admin]);
await db.query("insert into public.dilemma_admins values($1)", [admin]);
await db.exec("set role anon");
const submit = async () =>
  (
    await db.query("select public.submit_dilemma($1,$2,$3,$4) id", [
      "fr",
      "Une occasion unique exige de renoncer à un projet collectif important. Que choisis-tu ?",
      "Choisir mon projet personnel et quitter le groupe.",
      "Rester avec le groupe et renoncer à mon projet.",
    ])
  ).rows[0].id;
await assert.rejects(submit());
await assert.rejects(db.query("select * from public.dilemma_submissions"));
assert.equal(
  (await db.query("select * from public.published_dilemmas")).rows.length,
  0,
);
await db.exec("set role authenticated");
await assert.rejects(submit());
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
const id = await submit();
const draft = {
  prompt_fr:
    "Une occasion unique exige de renoncer à un projet collectif important. Que choisis-tu ?",
  prompt_en:
    "A unique opportunity means giving up an important shared project. What do you choose?",
  a_fr: "Choisir mon projet personnel et quitter le groupe.",
  a_en: "Choose my personal project and leave the group.",
  b_fr: "Rester avec le groupe et renoncer à mon projet.",
  b_en: "Stay with the group and give up my own project.",
  axis: "independence",
};
assert.equal(
  (await db.query("select * from public.dilemma_submissions")).rows.length,
  1,
);
await assert.rejects(
  db.query("select public.publish_dilemma($1,$2)", [
    id,
    { ...draft, prompt_en: "" },
  ]),
);
await db.query("select public.publish_dilemma($1,$2)", [id, draft]);
await assert.rejects(
  db.query("select public.publish_dilemma($1,$2)", [id, draft]),
);
const second = await submit();
await db.query("select public.reject_dilemma($1)", [second]);
await db.exec("set role anon");
assert.equal(
  (await db.query("select * from public.published_dilemmas")).rows.length,
  1,
);
await db.exec("reset role");
const q = (
  await db.query(
    "select question from public.dilemma_room_questions where id=$1",
    ["balanced-community-" + id],
  )
).rows[0].question;
assert.equal(q.pack, "general");
assert.equal(q.stableScoring, true);
assert.equal(q.options[0].weights.independence, 3);
await db.close();
console.log(
  "Community SQL passed: submission, private queue, admin-only review, bilingual validation, rejection and online catalog sync.",
);
