import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec("create role anon; create role authenticated;");
await db.exec(readFileSync("supabase/multiplayer.sql", "utf8"));
await db.exec(readFileSync("supabase/multiplayer-catalog.sql", "utf8"));
const bank = (
  await db.query(
    "select id,axis from public.dilemma_room_questions where pack='general' order by id",
  )
).rows;
const axes = [
  "adventure",
  "reason",
  "independence",
  "future",
  "structure",
  "ambition",
];
const deck = axes.flatMap((a, i) =>
  bank
    .filter((q) => q.axis === a)
    .slice(0, i < 4 ? 2 : 1)
    .map((q) => q.id),
);
await db.exec("set role anon;");
const call = async (action, token, code = "", payload = {}) =>
  (
    await db.query("select public.dilemma_room($1,$2,$3,$4::jsonb) as state", [
      action,
      token,
      code,
      JSON.stringify(payload),
    ])
  ).rows[0].state;
for (const reveal of ["round", "end"]) {
  const host = crypto.randomUUID(),
    guest = crypto.randomUUID(),
    outsider = crypto.randomUUID();
  let r = await call("create", host, "", {
    name: "Host",
    settings: { pack: "general", length: 10, timer: 20, reveal },
    deck,
  });
  const code = r.code;
  assert.equal((await call("create", host, "", {})).code, code);
  await assert.rejects(call("state", outsider, code));
  await call("join", guest, code, { name: "Guest" });
  await assert.rejects(call("start", guest, code));
  r = await call("start", host, code);
  await assert.rejects(call("join", outsider, code, { name: "Late" }));
  for (let round = 0; round < 10; round++) {
    const first = await call("answer", host, code, { round, option: 0 });
    assert.deepEqual(first.answers, []);
    assert.deepEqual((await call("state", guest, code)).answers, []);
    assert.equal(first.players.find((p) => p.id === first.me).answered, true);
    await call("answer", host, code, { round, option: 0 });
    await assert.rejects(call("answer", host, code, { round, option: 1 }));
    r = await call("answer", guest, code, { round, option: 1 });
    if (reveal === "round") {
      assert.equal(r.phase, "reveal");
      assert.equal(r.answers.length, 2);
      await assert.rejects(call("next", guest, code, { round }));
      r = await call("next", host, code, { round });
      await assert.rejects(call("next", host, code, { round }));
    } else if (round < 9) {
      assert.deepEqual(r.answers, []);
      assert.equal(r.phase, "question");
    }
  }
  assert.equal(r.phase, "finished");
  assert.equal(r.answers.length, 20);
  assert.equal(r.deck.length, 10);
  assert.ok(!JSON.stringify(r).includes(host));
  assert.ok(!JSON.stringify(r).includes(guest));
}
for (const table of [
  "dilemma_rooms",
  "dilemma_room_players",
  "dilemma_room_answers",
  "dilemma_room_questions",
])
  await assert.rejects(db.query(`select * from public.${table}`));
await db.close();
console.log(
  "Room SQL integration tests passed: two modes, privacy, host permissions, retries, late joins, direct table denial.",
);
