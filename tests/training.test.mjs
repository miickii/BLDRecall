import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  soundForPair,
  createFlow,
  advanceFlow,
  pauseFlow,
  resumeFlow,
  flowResult,
  validateFlowResult,
  recommendation,
} from "../src/training.js";
import {
  cardsFor,
  answerFor,
  emptyState,
  libraryFor,
  validateBackup,
  validateSounds,
} from "../src/engine.js";
const base = JSON.parse(
  await readFile(new URL("../data/library.json", import.meta.url), "utf8"),
);
test("22 spreadsheet stickers keep first and second sounds distinct", () => {
  assert.equal(Object.keys(base.sounds).length, 22);
  assert.deepEqual([base.sounds.UL.first, base.sounds.UL.second], ["P", "A"]);
  assert.deepEqual([base.sounds.FR.first, base.sounds.FR.second], ["H", "KS"]);
  assert.deepEqual([base.sounds.BD.first, base.sounds.BD.second], ["BL", "AR"]);
  assert.equal(base.sounds.LD.second, "Ø");
  assert.equal(base.sounds.UB.sourceCell, "E5");
});
test("every imported edge pair resolves to exactly one positional sound pair", () => {
  for (const pair of Object.keys(base.edges)) {
    const c = soundForPair(base, pair);
    assert.ok(c, pair);
    assert.equal(c.stickers.length, 2);
  }
});
test("sound composition uses first target first-position and second target second-position", () => {
  assert.equal(soundForPair(base, "PF").text, "P · AF");
  assert.equal(soundForPair(base, "DA").text, "D · A");
  assert.equal(soundForPair(base, "ZZ"), null);
  assert.equal(soundForPair(base, "JØ").text, "Y · Ø");
});
test("sound cards have independent schedules and preserve worksheet spellings", () => {
  const a = cardsFor(base, "sound-first").find((c) => c.pair === "FR");
  const b = cardsFor(base, "sound-second").find((c) => c.pair === "FR");
  assert.equal(answerFor(a), "H");
  assert.equal(answerFor(b), "KS");
  assert.notEqual(a.id, b.id);
  assert.equal(cardsFor(base, "sound-pair").length, 440);
});
test("sound edits change derived pair answers", () => {
  const l = libraryFor(base, { "sounds:UL": { first: "PA" } });
  assert.equal(soundForPair(l, "PF").text, "PA · AF");
  assert.equal(base.sounds.UL.first, "P");
});
test("ambiguous mapping is rejected instead of silently selecting a sound", () => {
  const l = structuredClone(base);
  l.sounds.UL.firstLabel = "D";
  assert.throws(() => validateSounds(l.sounds));
  assert.equal(soundForPair(l, "DF"), null);
});
function encoded(cube = false) {
  let f = createFlow(base, "edge", cube, 3, 0);
  f = advanceFlow(f, { type: "next" }, 100);
  for (const t of [1100, 3100, 6100]) f = advanceFlow(f, { type: "next" }, t);
  return f;
}
test("encoding measures each pair and keeps the same targets for recall", () => {
  const f = encoded();
  assert.equal(f.phase, "recall");
  assert.deepEqual(f.encoding, [1000, 2000, 3000]);
  assert.equal(f.cards.length, 3);
});
test("memo-only chain completes without fabricating execution ratings", () => {
  let f = encoded();
  f = advanceFlow(
    f,
    { type: "recall", answer: f.cards.map((c) => c.pair).join(" ") },
    8100,
  );
  const r = flowResult(f, 8200);
  assert.equal(r.correct, 3);
  assert.equal(r.recallMs, 2000);
  assert.deepEqual(r.grades, []);
  assert.deepEqual(r.execution, []);
  assert.ok(validateFlowResult(r));
});
test("cube chain measures retrieval, turning, and starts the next retrieval immediately", () => {
  let f = encoded(true);
  f = advanceFlow(
    f,
    { type: "recall", answer: f.cards.map((c) => c.pair).join(" ") },
    8100,
  );
  assert.equal(f.phase, "retrieve");
  f = advanceFlow(f, { type: "next" }, 9100);
  assert.equal(f.phase, "execute");
  f = advanceFlow(f, { type: "next" }, 11100);
  assert.equal(f.phase, "retrieve");
  assert.equal(f.startedAt, 11100);
  assert.equal(f.index, 1);
  f = advanceFlow(f, { type: "next" }, 12100);
  f = advanceFlow(f, { type: "next" }, 14100);
  f = advanceFlow(f, { type: "next" }, 15100);
  f = advanceFlow(f, { type: "next" }, 17100);
  assert.equal(f.phase, "grade");
  assert.equal(f.index, 0);
  assert.deepEqual(f.retrieval, [1000, 1000, 1000]);
  assert.deepEqual(f.execution, [2000, 2000, 2000]);
  for (let i = 0; i < 3; i++)
    f = advanceFlow(f, { type: "grade", grade: 2 }, 20000 + i);
  assert.equal(f.phase, "result");
  assert.ok(validateFlowResult(flowResult(f)));
});
test("pausing excludes time away and supports resuming after reload", () => {
  let f = createFlow(base, "corner", false, 3, 0);
  f = advanceFlow(f, { type: "next" }, 100);
  f = pauseFlow(f, 600);
  assert.equal(f.elapsed, 500);
  f = JSON.parse(JSON.stringify(f));
  f = resumeFlow(f, 10000);
  f = advanceFlow(f, { type: "next" }, 10500);
  assert.equal(f.encoding[0], 1000);
});
test("paused input cannot advance or reveal a target", () => {
  const f = pauseFlow(encoded(true), 10000);
  assert.deepEqual(advanceFlow(f, { type: "hint" }, 20000), f);
  assert.deepEqual(
    advanceFlow(f, { type: "recall", answer: "AB CD EF" }, 20000),
    f,
  );
});
test("hints flag assistance without creating confident individual ratings", () => {
  let f = createFlow(base, "edge", false, 3, 0);
  f = advanceFlow(f, { type: "next" }, 100);
  f = advanceFlow(f, { type: "hint" }, 150);
  f = advanceFlow(f, { type: "next" }, 200);
  assert.equal(f.assisted[0], true);
  assert.equal(f.hinted, false);
  assert.equal(f.phase, "encode");
});
test("incorrect sequence and extra input are accounted for", () => {
  let f = encoded();
  f = advanceFlow(f, { type: "recall", answer: "ZZ ZZ ZZ ZZ" }, 8000);
  const r = flowResult(f);
  assert.equal(r.correct, 0);
  assert.equal(r.extra, 1);
});
test("corner chain alternates object/action and only uses algorithm-backed pairs", () => {
  const f = createFlow(base, "corner", false, 3, 0);
  for (const [i, c] of f.cards.entries()) {
    assert.ok(base.corners[c.pair]);
    assert.equal(
      c.cue,
      i % 2 ? base.words[c.pair].action : base.words[c.pair].object,
    );
  }
  assert.equal(f.cards[1].role, "action");
});
test("v1 backups still import, newer backups preserve sound edits and chain results", () => {
  const old = emptyState();
  delete old.flowEvents;
  delete old.flow;
  assert.deepEqual(validateBackup(old, base).flowEvents, []);
  let f = encoded();
  f = advanceFlow(
    f,
    { type: "recall", answer: f.cards.map((c) => c.pair).join("") },
    8000,
  );
  const s = emptyState();
  s.flowEvents = [flowResult(f)];
  s.edits = { "sounds:UL": { first: "PA" } };
  const restored = validateBackup(s, base);
  assert.deepEqual(restored.flowEvents, s.flowEvents);
  assert.equal(restored.edits["sounds:UL"].first, "PA");
});
test("malformed connected scores cannot enter backup history", () => {
  const s = emptyState();
  s.flowEvents = [{ kind: "edge", correct: 99 }];
  assert.throws(() => validateBackup(s, base));
});
test("first recommendation is an explicit sound foundation session", () => {
  assert.equal(recommendation(emptyState()).type, "sounds");
});
