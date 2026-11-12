import { soundForPair, validateFlowResult } from "./training.js";
export const DAY = 86400000;
export const MODES = {
  "sound-first": {
    name: "Edge sound · first in pair",
    group: "Sounds",
    description:
      "Look at the highlighted sticker. Say its first-position sound, then reveal.",
    cube: false,
  },
  "sound-second": {
    name: "Edge sound · second in pair",
    group: "Sounds",
    description:
      "Look at the highlighted sticker. Say its second-position sound, then reveal.",
    cube: false,
  },
  "sound-pair": {
    name: "Edge sound pairs",
    group: "Sounds",
    description:
      "Join the first target’s first sound to the second target’s second sound. Say the pair, then reveal.",
    cube: false,
  },
  object: {
    name: "Object words",
    group: "Words",
    description: "See a pair. Find its image.",
    cube: false,
  },
  action: {
    name: "Action words",
    group: "Words",
    description: "Give each pair a little movement.",
    cube: false,
  },
  "reverse-object": {
    name: "Objects → letters",
    group: "Words",
    description: "Recover the pair from its object.",
    cube: false,
  },
  "reverse-action": {
    name: "Actions → letters",
    group: "Words",
    description: "Recover the pair from its action.",
    cube: false,
  },
  edge: {
    name: "Edge recall",
    group: "Algorithms",
    description: "Bring your edge commutators back.",
    cube: false,
  },
  corner: {
    name: "Corner recall",
    group: "Algorithms",
    description: "Remember the setup and structure.",
    cube: false,
  },
  "execute-edge": {
    name: "Edge execution",
    group: "Cube in hand",
    description: "Practice the moves on your cube.",
    cube: true,
  },
  "execute-corner": {
    name: "Corner execution",
    group: "Cube in hand",
    description: "Turn recalled cases into fluent moves.",
    cube: true,
  },
  ltct: {
    name: "LTCT recall",
    group: "Algorithms",
    description: "A separate queue for your LTCT cases.",
    cube: false,
  },
};
export function emptyState() {
  return {
    version: 1,
    reviews: {},
    events: [],
    memoEvents: [],
    flowEvents: [],
    flow: null,
    edits: {},
    settings: { minutes: 10, cube: false, limit: 20, showTimer: false },
    session: null,
  };
}
export function libraryFor(base, edits = {}) {
  const result = structuredClone(base);
  for (const [id, edit] of Object.entries(edits)) {
    const [collection, pair] = id.split(":");
    if (result[collection]?.[pair])
      Object.assign(result[collection][pair], edit);
  }
  return result;
}
export function cardsFor(library, mode) {
  if (!MODES[mode]) return [];
  if (mode === "sound-first" || mode === "sound-second")
    return Object.entries(library.sounds || {}).map(([pair, data]) => ({
      id: `${mode}:${pair}`,
      pair,
      mode,
      collection: "sounds",
      ...data,
    }));
  if (mode === "sound-pair")
    return Object.keys(library.edges).flatMap((pair) => {
      const sound = soundForPair(library, pair);
      return sound
        ? [
            {
              id: `${mode}:${pair}`,
              pair,
              mode,
              collection: "sounds",
              sound,
              answer: sound.text,
            },
          ]
        : [];
    });
  const words = MODES[mode].group === "Words";
  const collection = words
    ? "words"
    : mode.includes("edge")
      ? "edges"
      : mode.includes("corner")
        ? "corners"
        : "ltct";
  return Object.entries(library[collection]).map(([pair, data]) => ({
    id: `${mode}:${pair}`,
    pair,
    mode,
    collection,
    ...data,
  }));
}
export function answerFor(card) {
  if (card.mode === "sound-first") return card.first;
  if (card.mode === "sound-second") return card.second;
  if (card.mode === "sound-pair") return card.answer;
  if (card.mode.startsWith("reverse-")) return card.pair;
  if (card.mode === "object" || card.mode === "action") return card[card.mode];
  return card.commutator || card.algorithm || "";
}
export function promptFor(card) {
  return card.mode.startsWith("reverse-")
    ? card[card.mode.slice(8)]
    : card.pair;
}
export function buildQueue(
  cards,
  reviews,
  { limit = 20, kind = "balanced", letters = "", now = Date.now() } = {},
) {
  const chars = new Set(
    [...letters.toLocaleUpperCase()].filter((c) => !/[\s,]/.test(c)),
  );
  let pool = cards.filter((c) => !chars.size || chars.has(c.pair[0]));
  if (kind === "due")
    pool = pool.filter((c) => reviews[c.id] && reviews[c.id].due <= now);
  if (kind === "weak")
    pool = pool.filter(
      (c) =>
        reviews[c.id] &&
        (reviews[c.id].lastGrade < 2 || reviews[c.id].lapses > 0),
    );
  // Due reviews, then untested cards, then not-yet-due maintenance.
  const priority = (c) =>
    !reviews[c.id] ? 1 : reviews[c.id].due <= now ? 0 : 2;
  pool = pool
    .map((c) => ({ c, tie: Math.random() }))
    .sort((a, b) => {
      if (kind === "weak")
        return (
          (reviews[b.c.id]?.lapses || 0) - (reviews[a.c.id]?.lapses || 0) ||
          a.tie - b.tie
        );
      return (
        priority(a.c) - priority(b.c) ||
        (reviews[a.c.id]?.due || now) - (reviews[b.c.id]?.due || now) ||
        a.tie - b.tie
      );
    })
    .map((x) => x.c);
  return pool.slice(0, Math.max(1, limit));
}
export function schedule(previous, grade, now = Date.now(), hinted = false) {
  const p = previous || { attempts: 0, lapses: 0, interval: 0, streak: 0 };
  const effective = hinted ? Math.min(grade, 1) : grade;
  const interval =
    effective === 0
      ? 10 / 1440
      : effective === 1
        ? Math.max(0.25, Math.min(3, (p.interval || 0.25) * 1.2))
        : Math.min(180, p.streak ? Math.max(1, p.interval * 2.4) : 1);
  return {
    ...p,
    attempts: p.attempts + 1,
    lapses: p.lapses + Number(effective === 0),
    interval,
    streak: effective === 2 ? p.streak + 1 : 0,
    lastGrade: effective,
    lastSeen: now,
    due: now + interval * DAY,
  };
}
export function recordReview(
  state,
  card,
  grade,
  elapsedMs,
  hinted = false,
  now = Date.now(),
) {
  const review = schedule(state.reviews[card.id], grade, now, hinted);
  return {
    ...state,
    reviews: { ...state.reviews, [card.id]: review },
    events: [
      ...state.events,
      {
        id: card.id,
        mode: card.mode,
        pair: card.pair,
        grade: review.lastGrade,
        elapsedMs: Math.max(0, elapsedMs),
        hinted,
        at: now,
      },
    ].slice(-30000),
  };
}
export function statsFor(state, cards, now = Date.now()) {
  const ids = new Set(cards.map((c) => c.id));
  const records = Object.entries(state.reviews)
    .filter(([id]) => ids.has(id))
    .map(([, v]) => v);
  return {
    total: cards.length,
    seen: records.length,
    due: records.filter((r) => r.due <= now).length,
    confident: records.filter((r) => r.lastGrade === 2).length,
  };
}
export function validateBackup(value, base) {
  if (
    !value ||
    value.version !== 1 ||
    !value.reviews ||
    typeof value.reviews !== "object" ||
    Array.isArray(value.reviews) ||
    !Array.isArray(value.events) ||
    !value.edits ||
    typeof value.edits !== "object" ||
    Array.isArray(value.edits)
  )
    throw new Error("This is not a Recall v1 backup.");
  const state = emptyState();
  const ids = new Set(
    Object.keys(MODES).flatMap((m) => cardsFor(base, m).map((c) => c.id)),
  );
  for (const [id, r] of Object.entries(value.reviews)) {
    if (
      !ids.has(id) ||
      !r ||
      ![
        "attempts",
        "lapses",
        "interval",
        "streak",
        "lastSeen",
        "due",
        "lastGrade",
      ].every((k) => Number.isFinite(r[k]) && r[k] >= 0) ||
      r.lastGrade > 2
    )
      throw new Error("Backup contains invalid review records.");
    state.reviews[id] = r;
  }
  for (const e of value.events) {
    if (
      !e ||
      !ids.has(e.id) ||
      !Number.isFinite(e.at) ||
      !Number.isFinite(e.elapsedMs) ||
      e.elapsedMs < 0 ||
      ![0, 1, 2].includes(e.grade)
    )
      throw new Error("Backup contains invalid practice history.");
    state.events.push({
      ...e,
      mode: e.id.split(":")[0],
      pair: e.id.split(":")[1],
    });
  }
  if (value.memoEvents !== undefined) {
    if (!Array.isArray(value.memoEvents))
      throw new Error("Invalid memo history.");
    for (const e of value.memoEvents) {
      if (
        !e ||
        !Number.isFinite(e.at) ||
        !Number.isInteger(e.length) ||
        e.length < 2 ||
        e.length > 8 ||
        !Number.isInteger(e.correct) ||
        e.correct < 0 ||
        e.correct > e.length ||
        !Number.isFinite(e.delay) ||
        e.delay < 0 ||
        !Number.isFinite(e.studyMs) ||
        e.studyMs < 0
      )
        throw new Error("Invalid memo result.");
      state.memoEvents.push(e);
    }
  }
  if (value.flowEvents !== undefined) {
    if (
      !Array.isArray(value.flowEvents) ||
      !value.flowEvents.every(validateFlowResult)
    )
      throw new Error("Invalid connected practice history.");
    state.flowEvents = value.flowEvents;
  }
  const allowed = {
    sounds: ["first", "second", "firstLabel", "secondLabel"],
    words: ["object", "action"],
    edges: ["commutator", "algorithm", "setup"],
    corners: ["commutator", "algorithm", "setup"],
    ltct: ["algorithm", "setup"],
  };
  for (const [id, edit] of Object.entries(value.edits)) {
    const [collection, pair] = id.split(":");
    if (
      !Object.hasOwn(allowed, collection) ||
      !Object.hasOwn(base[collection], pair) ||
      !edit ||
      typeof edit !== "object"
    )
      throw new Error("Backup contains an unknown library entry.");
    state.edits[id] = {};
    for (const [key, text] of Object.entries(edit)) {
      if (
        !allowed[collection].includes(key) ||
        typeof text !== "string" ||
        text.length > 5000
      )
        throw new Error("Backup contains invalid library edits.");
      state.edits[id][key] = text;
    }
  }
  validateSounds(libraryFor(base, state.edits).sounds);
  if (value.settings) {
    state.settings = {
      minutes: [5, 10, 15, 20].includes(value.settings.minutes)
        ? value.settings.minutes
        : 10,
      cube: value.settings.cube === true,
      limit: Math.min(100, Math.max(5, Number(value.settings.limit) || 20)),
      showTimer: value.settings.showTimer === true,
    };
  }
  // Active queues contain transient timing state: backups deliberately restart at Today.
  return state;
}

export function validateSounds(sounds) {
  if (!sounds) return;
  for (const field of ["firstLabel", "secondLabel"]) {
    const labels = Object.values(sounds).map((s) => s[field]);
    if (
      labels.some((l) => typeof l !== "string" || !/^[A-ZØ]$/.test(l)) ||
      new Set(labels).size !== labels.length
    )
      throw new Error(
        "Sound labels must be unique within each position (one letter, including Ø).",
      );
  }
  if (Object.values(sounds).some((s) => !s.first?.trim() || !s.second?.trim()))
    throw new Error("Both positional sounds are required.");
}
