// Connected practice uses a single sequence throughout. No aggregate score is
// propagated to individual SRS cards: sequence and cube correctness differ.
export function soundForPair(library, pair) {
  const entries = Object.entries(library.sounds || {});
  const first = entries.filter(([, s]) => s.firstLabel === pair[0]);
  const second = entries.filter(([, s]) => s.secondLabel === pair[1]);
  if (first.length !== 1 || second.length !== 1) return null;
  return {
    first: first[0][1].first,
    second: second[0][1].second,
    stickers: [first[0][0], second[0][0]],
    text: `${first[0][1].first} · ${second[0][1].second}`,
  };
}
export function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function flowPool(library, kind) {
  const source = kind === "edge" ? library.edges : library.corners;
  return Object.entries(source).flatMap(([pair, alg]) => {
    const cue =
      kind === "edge" ? soundForPair(library, pair) : library.words[pair];
    if (!cue || !(alg.commutator || alg.algorithm)) return [];
    return [
      {
        pair,
        algorithm: alg.commutator || alg.algorithm,
        expanded: alg.algorithm || "",
        cue: kind === "edge" ? cue.text : cue.object,
        action: kind === "corner" ? cue.action : "",
        stickers: cue.stickers || [],
      },
    ];
  });
}
export function createFlow(
  library,
  kind,
  cube = false,
  length = 3,
  time = Date.now(),
) {
  const recent = shuffled(flowPool(library, kind)).slice(
    0,
    Math.max(2, Math.min(6, length)),
  );
  if (recent.length < 2)
    throw new Error(
      "At least two complete cases are needed. Check the sound labels in Library.",
    );
  return {
    kind,
    cube,
    cards: recent.map((c, i) => ({
      ...c,
      cue: kind === "corner" && i % 2 ? c.action : c.cue,
      role: kind === "edge" ? "sound" : i % 2 ? "action" : "object",
    })),
    phase: "ready",
    index: 0,
    startedAt: null,
    elapsed: 0,
    paused: false,
    hinted: false,
    encoding: [],
    retrieval: [],
    execution: [],
    assisted: [],
    grades: [],
    decoded: [],
    recallMs: 0,
    createdAt: time,
  };
}
export function flowElapsed(flow, time) {
  return (
    flow.elapsed +
    (flow.startedAt === null ? 0 : Math.max(0, time - flow.startedAt))
  );
}
export function pauseFlow(flow, time = Date.now()) {
  if (flow.paused) return flow;
  return {
    ...flow,
    elapsed: flowElapsed(flow, time),
    startedAt: null,
    paused: true,
  };
}
export function resumeFlow(flow, time = Date.now()) {
  return {
    ...flow,
    paused: false,
    startedAt: ["encode", "recall", "retrieve", "execute"].includes(flow.phase)
      ? time
      : null,
  };
}
export function advanceFlow(flow, event, time = Date.now()) {
  const f = structuredClone(flow);
  if (f.paused) return f;
  const elapsed = flowElapsed(f, time);
  const phase = (name, index = f.index) => {
    f.phase = name;
    f.index = index;
    f.elapsed = 0;
    f.startedAt = ["encode", "recall", "retrieve", "execute"].includes(name)
      ? time
      : null;
    f.hinted = false;
  };
  if (event.type === "hint" && ["encode", "retrieve"].includes(f.phase)) {
    f.hinted = true;
    f.assisted[f.index] = true;
    return f;
  }
  if (f.phase === "ready" && event.type === "next") phase("encode", 0);
  else if (f.phase === "encode" && event.type === "next") {
    f.encoding.push(elapsed);
    if (f.index + 1 < f.cards.length) phase("encode", f.index + 1);
    else phase("recall", 0);
  } else if (f.phase === "recall" && event.type === "recall") {
    const tokens =
      String(event.answer)
        .toUpperCase()
        .replace(/[\s,]+/g, "")
        .match(/.{1,2}/gu) || [];
    f.decoded = tokens;
    f.recallMs = elapsed;
    // Do not reveal correct targets here: retrieval must still come from memory.
    phase(f.cube ? "retrieve" : "result", 0);
  } else if (f.phase === "retrieve" && event.type === "next") {
    f.retrieval.push(elapsed);
    phase("execute");
  } else if (f.phase === "execute" && event.type === "next") {
    f.execution.push(elapsed);
    if (f.index + 1 < f.cards.length) phase("retrieve", f.index + 1);
    else phase("grade", 0);
  } else if (f.phase === "grade" && event.type === "grade") {
    if (![0, 1, 2].includes(event.grade)) return flow;
    f.grades.push(event.grade);
    if (f.index + 1 < f.cards.length) phase("grade", f.index + 1);
    else phase("result");
  }
  return f;
}
export function flowResult(flow, time = Date.now()) {
  if (flow.phase !== "result")
    throw new Error("Only completed rounds can be saved.");
  return {
    at: time,
    kind: flow.kind,
    cube: flow.cube,
    pairs: flow.cards.map((c) => c.pair),
    correct: flow.cards.filter((c, i) => c.pair === flow.decoded[i]).length,
    extra: Math.max(0, flow.decoded.length - flow.cards.length),
    encoding: flow.encoding,
    retrieval: flow.retrieval,
    execution: flow.execution,
    grades: flow.grades,
    assisted: flow.cards.map((_, i) => Boolean(flow.assisted[i])),
    recallMs: flow.recallMs,
  };
}
export function validateFlowResult(r) {
  if (
    !r ||
    !["edge", "corner"].includes(r.kind) ||
    typeof r.cube !== "boolean" ||
    !Number.isFinite(r.at) ||
    !Array.isArray(r.pairs) ||
    r.pairs.length < 2 ||
    r.pairs.length > 6 ||
    !r.pairs.every((p) => typeof p === "string" && [...p].length === 2)
  )
    return false;
  const n = r.pairs.length,
    nonnegative = (x) => Number.isFinite(x) && x >= 0;
  return (
    Number.isInteger(r.correct) &&
    r.correct >= 0 &&
    r.correct <= n &&
    Number.isInteger(r.extra) &&
    r.extra >= 0 &&
    nonnegative(r.recallMs) &&
    ["encoding", "retrieval", "execution"].every(
      (k) =>
        Array.isArray(r[k]) &&
        r[k].length === (k === "encoding" || r.cube ? n : 0) &&
        r[k].every(nonnegative),
    ) &&
    Array.isArray(r.assisted) &&
    r.assisted.length === n &&
    r.assisted.every((x) => typeof x === "boolean") &&
    Array.isArray(r.grades) &&
    r.grades.length === (r.cube ? n : 0) &&
    r.grades.every((x) => [0, 1, 2].includes(x))
  );
}
export function recommendation(state) {
  const events = state.events || [];
  const due = Object.entries(state.reviews || {})
    .filter(
      ([id, r]) =>
        r.due <= Date.now() &&
        (state.settings.cube || !id.startsWith("execute-")),
    )
    .sort((a, b) => a[1].due - b[1].due);
  const has = (m) => events.filter((e) => e.mode === m).length;
  if (due.length >= 5) {
    const mode = due[0][0].split(":")[0];
    return {
      type: "single",
      mode,
      title: "Refresh what’s due",
      why: "A short review of material you have already practiced.",
    };
  }
  if (has("sound-first") + has("sound-second") < 12)
    return {
      type: "sounds",
      title: "Start with edge sounds",
      why: "Build instant first- and second-position recall before joining sounds into pairs.",
    };
  if (has("sound-pair") < 10)
    return {
      type: "single",
      mode: "sound-pair",
      title: "Join your edge sounds",
      why: "You have practiced individual sounds. Now blend them into a pair without hesitation.",
    };
  if (has("object") < 10)
    return {
      type: "single",
      mode: "object",
      title: "Make corner images faster",
      why: "Recall the object, then actually picture it before tapping Reveal.",
    };
  const rounds = state.flowEvents || [];
  const kind = rounds.at(-1)?.kind === "edge" ? "corner" : "edge";
  return {
    type: "flow",
    kind,
    title: state.settings.cube
      ? "Connect memo to execution"
      : "Build a short memo chain",
    why: `Work through three ${kind} pairs as one sequence. ${state.settings.cube ? "Separate remembering the moves from turning them." : "Link the cues, hide them, and recover the sequence."}`,
  };
}
