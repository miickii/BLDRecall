import {
  MODES,
  DAY,
  emptyState,
  libraryFor,
  cardsFor,
  answerFor,
  promptFor,
  buildQueue,
  recordReview,
  statsFor,
  validateBackup,
  validateSounds,
} from "./engine.js";
import {
  homeView,
  practiceView,
  stickerNet,
  objectiveFor,
  flowView,
} from "./experience.js";
import {
  createFlow,
  advanceFlow,
  pauseFlow,
  resumeFlow,
  flowResult,
  recommendation,
} from "./training.js";
import { openStore, load, save } from "./storage.js";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{ sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>', practice: '<path d="m9 5 11 7-11 7zM4 5v14"/>', book: '<path d="M12 5v15M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/>', chart: '<path d="M4 20V4m0 16h17M8 15v-4m5 4V7m5 8V3"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 1 2 4 3-1 3 1 2-4 3-1-1-4 2-2-3-3-3-1-1-3z"/>', arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>', check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5M7.5 9.5v10"/>', download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>' }[name] || ""}</svg>`;
let base,
  state,
  library,
  page = "today",
  filter = "words",
  search = "",
  session = null,
  memo = null,
  installPrompt = null,
  saveError = false,
  storageAvailable = true,
  toastTimeout,
  flow = null,
  practiceGoal = "memo";
const now = () => Date.now();
const dateKey = (t) => new Date(t).toLocaleDateString("en-CA");
const label = (grade) => ["Forgot", "Hesitated", "Confident"][grade];
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    4500,
  );
}
async function persist() {
  state.flow = flow ? pauseFlow(flow, now()) : null;
  state.session = session
    ? {
        ...session,
        paused: true,
        startedAt: null,
        remainingBudget: session.endAt
          ? Math.max(0, session.endAt - now())
          : session.remainingBudget || 0,
        endAt: 0,
      }
    : null;
  try {
    if (!storageAvailable) throw new Error();
    await save(state);
    saveError = false;
  } catch {
    saveError = true;
    toast("Progress could not be saved. Export a backup before closing.");
  }
}
function allCards() {
  return Object.keys(MODES).flatMap((mode) => cardsFor(library, mode));
}
function cubeArt() {
  return `<svg class="cube-art" viewBox="0 0 280 260" fill="none" aria-hidden="true"><ellipse cx="145" cy="235" rx="91" ry="12" fill="#000" opacity=".13"/><g stroke="#263e36" stroke-width="3" stroke-linejoin="round"><path d="m135 24 108 60-108 61L27 84z" fill="#d6ee9c"/><path d="m27 84 108 61v98L27 182z" fill="#92b78b"/><path d="m135 145 108-61v98l-108 61z" fill="#b6d480"/><path d="m63 64 108 61M99 44l108 61M63 105 108-61M99 125l108-61M63 105v98m36-78v98M27 117l108 61m-108-28 108 61m36-86v98m36-118v98m-72-25 108-61m-108 94 108-61"/></g><path d="m238 29 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#d6ee9c"/><circle cx="28" cy="209" r="4" fill="#d6ee9c"/></svg>`;
}
function shell(content) {
  const nav = [
    ["today", "sun", "Today"],
    ["practice", "practice", "Practice"],
    ["library", "book", "Library"],
    ["progress", "chart", "Progress"],
  ];
  $("#app").innerHTML =
    `<aside class="sidebar"><a href="#today" class="brand"><span class="brand-icon">${icon("cube", 26)}</span>recall<span class="brand-dot">.</span></a><div class="brand-sub">YOUR 3BLD PRACTICE SPACE</div><nav aria-label="Main navigation">${nav.map(([id, i, text]) => `<a href="#${id}" class="nav-item ${page === id ? "active" : ""}" ${page === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${text}</span>${id === "today" ? '<span class="tiny-dot"></span>' : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><div class="offline-note"><span class="status-dot"></span><strong>Made for your own pace.</strong><p>A little recall, every day.</p></div><a class="nav-item ${page === "settings" ? "active" : ""}" href="#settings">${icon("settings")}<span>Settings & backups</span></a></div></aside><div class="workspace"><header class="topbar"><span>PERSONAL TRAINING / <strong>3BLD</strong></span><div class="top-status"><span class="status-dot"></span>${navigator.onLine ? "Local progress" : "Offline"}<button class="avatar" data-action="settings" aria-label="Open settings">${icon("cube", 17)}</button></div></header>${saveError ? '<div class="warning">Saving is unavailable. Keep this tab open and export a backup in Settings.</div>' : ""}<main id="main">${content}</main><footer class="footer">Built around your words. Practiced at your pace.<span>RECALL / 01</span></footer></div><nav class="mobile-nav" aria-label="Mobile navigation">${nav.map(([id, i, text]) => `<a href="#${id}" class="${page === id ? "active" : ""}">${icon(i)}<span>${text}</span></a>`).join("")}</nav>`;
  bind();
}
function heading(kicker, title, description, extra = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;
}
function render() {
  library = libraryFor(base, state.edits);
  if (flow && page === "flow") {
    shell(flowView(flow));
    return;
  }
  if (session && page === "session") {
    renderSession();
    return;
  }
  if (memo && page === "memo") {
    renderMemo();
    return;
  }
  (
    ({
      today: renderToday,
      practice: renderPractice,
      library: renderLibrary,
      progress: renderProgress,
      settings: renderSettings,
      summary: renderSummary,
    })[page] || renderToday
  )();
}
function renderToday() {
  shell(homeView(state, session, flow));
}
function renderPractice() {
  shell(practiceView(state, practiceGoal));
}
function begin(cards, title, budget = 0) {
  if (!cards.length) {
    toast(
      "No cases match this selection. Try another focus or leave letters blank.",
    );
    return;
  }
  session = {
    queue: cards.map((c) => ({ id: c.id })),
    index: 0,
    initialCount: cards.length,
    title,
    phase: "question",
    paused: false,
    startedAt: now(),
    elapsed: 0,
    hinted: false,
    results: [],
    repeated: [],
    budget,
    endAt: budget ? now() + budget * 60000 : 0,
  };
  state.session = session;
  page = "session";
  persist();
  render();
  window.scrollTo(0, 0);
}
function currentCard() {
  const id = session.queue[session.index]?.id;
  const mode = id?.split(":")[0];
  return cardsFor(library, mode).find((c) => c.id === id);
}
function startDaily() {
  const modes = state.settings.cube
    ? ["sound-pair", "object", "execute-edge", "execute-corner"]
    : ["sound-pair", "object", "action", "edge", "corner"];
  const all = modes.flatMap((m) => cardsFor(library, m));
  const limit = state.settings.minutes * 2;
  // Interleave skills on a new profile rather than filling the entire session from one deck.
  const queues = modes.map((m) =>
    buildQueue(cardsFor(library, m), state.reviews, {
      limit: Math.ceil(limit / modes.length),
    }),
  );
  let queue = [];
  for (let i = 0; i < Math.ceil(limit / modes.length); i++)
    for (const q of queues) if (q[i]) queue.push(q[i]);
  const due = buildQueue(all, state.reviews, {
    limit: Math.ceil(limit * 0.6),
    kind: "due",
  });
  const seen = new Set(due.map((c) => c.id));
  queue = [...due, ...queue.filter((c) => !seen.has(c.id))].slice(0, limit);
  begin(queue, "Daily practice", state.settings.minutes);
}
function renderSession() {
  const card = currentCard();
  if (!card) {
    finish();
    return;
  }
  const meta = MODES[card.mode],
    execution = meta.cube,
    sound = meta.group === "Sounds";
  const revealed = session.phase === "answer",
    percent = (session.index / session.queue.length) * 100;
  const visual = card.mode === "sound-first" || card.mode === "sound-second";
  shell(`<div class="session-top"><button class="text-button" data-action="pause">← Pause & leave</button><strong>${esc(session.title)}</strong><span>${session.index + 1} / ${session.queue.length}</span></div><div class="progress-track"><div style="width:${percent}%"></div></div>
 <section class="training-card"><header class="exercise-heading"><span class="drill-tag">${execution ? "CUBE EXECUTION" : sound ? "EDGE SOUND MEMO" : meta.group === "Words" ? "CORNER IMAGE MEMO" : "ALGORITHM RECALL"}</span><h1>${esc(meta.name)}</h1></header>
 ${
   session.paused
     ? `<div class="paused"><h2>Practice paused</h2><p>Timing is paused. Continue when you’re ready.</p><button class="button" data-action="unpause">Continue →</button></div>`
     : `
 <div class="exercise-objective"><strong>Your objective</strong><p>${esc(objectiveFor(card))}</p></div>
 ${visual ? `<div class="sticker-prompt"><h2>${esc(card.pair)}</h2><span>${card.mode === "sound-first" ? "FIRST" : "SECOND"} IN THE PAIR</span>${revealed ? "" : stickerNet(card.pair)}</div>` : `<h2 class="pair-prompt ${card.mode.startsWith("reverse-") ? "word-prompt" : ""}">${esc(promptFor(card))}</h2>${card.sound ? `<p class="sound-components">${card.sound.stickers.map((sticker, i) => `${i + 1}. ${esc(sticker)} · ${i ? "second" : "first"} sound`).join(" → ")}</p>` : ""}`}
 ${execution && !revealed ? `<details class="execution-note" open><summary>Prepare this case</summary>${card.setup ? `<p class="alg">${esc(card.setup)}</p>` : "<p>Use your own setup or practice this algorithm from solved.</p>"}<p class="muted">Imported setup · execution is self-graded.</p></details>` : ""}
 ${session.hinted && !revealed ? `<div class="hint-box">${esc(sound || meta.group === "Words" ? answerFor(card).slice(0, 1) + "…" : card.setup ? "Setup: " + card.setup : answerFor(card))}</div>` : ""}
 ${revealed ? `<div class="answer-box"><span class="eyebrow">${sound ? "YOUR SOUND" : meta.group === "Words" ? "YOUR ASSOCIATION" : "YOUR ALGORITHM"}</span><p class="answer ${sound || meta.group === "Words" ? "" : "alg"}">${esc(answerFor(card))}</p>${card.algorithm && card.commutator ? `<details><summary>Expanded moves</summary><p class="alg">${esc(card.algorithm)}</p></details>` : ""}<p class="answer-meta">${(session.elapsed / 1000).toFixed(1)}s${session.hinted ? " · hint used" : ""} · ${execution ? "execution" : "recall"} time</p></div><p class="grade-instruction">${execution ? "Was the execution correct and fluent?" : "Did you recall it before revealing?"}</p><div class="grade-buttons"><button data-action="grade" data-grade="0"><strong>${execution ? "Incorrect" : "Forgot"}</strong><small>Relearn soon <kbd>1</kbd></small></button><button data-action="grade" data-grade="1"><strong>Hesitated</strong><small>Review sooner <kbd>2</kbd></small></button><button data-action="grade" data-grade="2"><strong>${execution ? "Clean" : "Instant / clear"}</strong><small>Space it out <kbd>3</kbd></small></button></div>` : `<div class="recall-controls">${execution && session.phase !== "executing" ? '<button class="button large" data-action="execute">Start execution timer</button>' : `<button class="button large" data-action="reveal">${execution ? "Finish & check" : "Reveal answer"} →</button>`}${!execution ? '<button class="text-button" data-action="hint">I need a hint</button>' : ""}</div>${state.settings.showTimer ? '<div class="live-timer" id="live-timer">0.0s</div>' : ""}`}
 `
 }<div class="training-bottom"><button class="text-button" data-action="edit-current">${card.mode === "sound-pair" ? "Edit sound library" : "Edit this " + (sound ? "sound" : meta.group === "Words" ? "word" : "case")}</button><span>Space to reveal · 1 / 2 / 3 to grade</span><button class="text-button" data-action="finish">Finish session</button></div></section>`);
}
function reveal() {
  if (!session || session.paused || session.phase === "answer") return;
  if (MODES[currentCard().mode].cube && session.phase !== "executing") {
    session.phase = "executing";
    session.startedAt = now();
    session.elapsed = 0;
    persist();
    render();
    return;
  }
  session.elapsed += session.startedAt ? now() - session.startedAt : 0;
  session.startedAt = null;
  session.phase = "answer";
  persist();
  render();
}
function grade(n) {
  if (!session || session.paused || session.phase !== "answer") return;
  const card = currentCard();
  state = recordReview(state, card, n, session.elapsed, session.hinted);
  session.results.push({
    id: card.id,
    grade: state.reviews[card.id].lastGrade,
    elapsed: session.elapsed,
  });
  if (n === 0 && !session.repeated.includes(card.id)) {
    session.queue.splice(Math.min(session.index + 4, session.queue.length), 0, {
      id: card.id,
    });
    session.repeated.push(card.id);
  }
  session.index++;
  session.phase = "question";
  session.elapsed = 0;
  session.startedAt = now();
  session.hinted = false;
  if (
    session.index >= session.queue.length ||
    (session.endAt && now() >= session.endAt)
  ) {
    finish();
    return;
  }
  persist();
  render();
  window.scrollTo(0, 0);
}
let lastSummary = null;
function finish() {
  if (!session) return;
  lastSummary = { ...session };
  session = null;
  state.session = null;
  persist();
  page = "summary";
  render();
}
function renderSummary() {
  const results = lastSummary?.results || [],
    confident = results.filter((r) => r.grade === 2).length,
    forgot = results.filter((r) => r.grade === 0).length;
  shell(
    `<section class="summary panel"><div class="summary-icon">${icon("check", 35)}</div><div class="eyebrow">SESSION COMPLETE</div><h1>A little stronger.</h1><p>${results.length ? "You showed up and practiced. Your next reviews are scheduled." : "Your session is closed. Come back whenever you’re ready."}</p><div class="summary-stats"><div><strong>${results.length}</strong><span>Prompts practiced</span></div><div><strong>${confident}</strong><span>Confident</span></div><div><strong>${forgot}</strong><span>To relearn</span></div></div><a class="button" href="#today">Back to today ${icon("arrow")}</a><a class="button secondary" href="#progress">View progress</a></section>`,
  );
}
function pause(leave = true) {
  if (!session) return;
  if (session.startedAt) session.elapsed += now() - session.startedAt;
  session.startedAt = null;
  session.paused = true;
  if (session.endAt) {
    session.remainingBudget = Math.max(0, session.endAt - now());
    session.endAt = 0;
  }
  persist();
  if (leave) page = "today";
  render();
}
function renderLibrary() {
  const collections = {
    sounds: "Edge sounds",
    words: "Letter pairs",
    edges: "Edges",
    corners: "Corners",
    ltct: "LTCT",
  };
  const entries = Object.entries(library[filter]).filter(([pair, v]) =>
    (
      pair +
      " " +
      Object.values(v)
        .filter((x) => typeof x === "string")
        .join(" ")
    )
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  shell(
    heading(
      "MAKE IT YOURS",
      "Your library.",
      "Your familiar words and algorithms, all in one place.",
    ) +
      `<div class="library-toolbar"><div class="tabs" role="group" aria-label="Library category">${Object.entries(
        collections,
      )
        .map(
          ([key, name]) =>
            `<button data-action="filter" data-value="${key}" class="${filter === key ? "active" : ""}">${name}</button>`,
        )
        .join(
          "",
        )}</div><label class="search-label"><span class="sr-only">Search library</span><input id="library-search" type="search" placeholder="Search a pair or word…" value="${esc(search)}"></label></div><div class="library-meta"><span>${entries.length} entries</span><span>${filter === "sounds" ? "First / second sound · labels derived from your conversion script" : filter === "words" ? "Original words kept · alternatives preserved" : "Imported cases · original letter labels retained"}</span></div><section class="library-list">${
        entries
          .slice(0, 100)
          .map(([pair, v]) => {
            const review =
              state.reviews[
                `${filter === "sounds" ? "sound-first" : filter === "words" ? "object" : filter === "edges" ? "edge" : filter === "corners" ? "corner" : "ltct"}:${pair}`
              ];
            return `<button class="library-row" data-action="edit" data-pair="${esc(pair)}" data-collection="${filter}"><span class="library-pair">${esc(pair)}</span><div class="library-content">${filter === "sounds" ? `<strong>First: ${esc(v.first)} · Second: ${esc(v.second)}</strong><span>Pair labels: ${esc(v.firstLabel)} / ${esc(v.secondLabel)} · Sheet1 ${esc(v.sourceCell)}</span>` : filter === "words" ? `<strong>${esc(v.object)}</strong><span>${esc(v.action)}${Object.keys(v.alternatives || {}).length ? " · alternative available" : ""}</span>` : `<span class="alg">${esc(v.commutator || v.algorithm)}</span>`}</div><span class="review-badge ${review ? "reviewed" : ""}">${review ? label(review.lastGrade) : "Unseen"}</span><span class="row-arrow">↗</span></button>`;
          })
          .join("") ||
        '<div class="empty">No matching entries. Try another word or pair.</div>'
      }</section>${entries.length > 100 ? '<p class="muted center">Showing the first 100 matches. Search to narrow the list.</p>' : ""}`,
  );
}
function editEntry(collection, pair) {
  const entry = library[collection][pair];
  if (session && !session.paused) pause(false);
  const fields =
    collection === "sounds"
      ? ["first", "second", "firstLabel", "secondLabel"]
      : collection === "words"
        ? ["object", "action"]
        : collection === "ltct"
          ? ["algorithm", "setup"]
          : ["commutator", "algorithm", "setup"];
  const dialog = document.createElement("dialog");
  dialog.innerHTML = `<form id="edit-form"><div class="dialog-heading"><div><div class="eyebrow">YOUR LIBRARY</div><h2>${esc(pair)}</h2></div><button class="icon-button" type="button" data-close aria-label="Close editor">${icon("close")}</button></div>${fields.map((f) => `<label>${{ first: "First-position sound", second: "Second-position sound", firstLabel: "First-position pair label", secondLabel: "Second-position pair label" }[f] || f[0].toUpperCase() + f.slice(1)}${collection === "words" || collection === "sounds" ? `<input name="${f}" value="${esc(entry[f] || "")}" maxlength="5000" required>` : `<textarea name="${f}" rows="3" maxlength="5000">${esc(entry[f] || "")}</textarea>`}${entry.alternatives?.[f] ? `<span class="alternative">Other saved version: <button type="button" data-alternative="${f}" data-word="${esc(entry.alternatives[f])}">${esc(entry.alternatives[f])} ↗</button></span>` : ""}</label>`).join("")}<p class="muted">Edits stay on this device and are included in backups. Changing an answer resets its affected review history.</p><p id="edit-error" role="alert" class="edit-error"></p><div class="dialog-actions"><button type="button" class="button secondary" data-close>Cancel</button><button class="button" type="submit">Save changes</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => dialog.close()));
  dialog.onclose = () => dialog.remove();
  dialog.querySelectorAll("[data-alternative]").forEach(
    (b) =>
      (b.onclick = () => {
        dialog.querySelector(`[name="${b.dataset.alternative}"]`).value =
          b.dataset.word;
      }),
  );
  dialog.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    const edit = Object.fromEntries(new FormData(e.target));
    const changed = fields.filter((f) => edit[f] !== String(entry[f] || ""));
    if (!changed.length) {
      dialog.close();
      return;
    }
    if (collection === "sounds") {
      try {
        validateSounds(
          libraryFor(base, { ...state.edits, [`${collection}:${pair}`]: edit })
            .sounds,
        );
      } catch (error) {
        dialog.querySelector("#edit-error").textContent = error.message;
        return;
      }
    }
    state.edits[`${collection}:${pair}`] = edit;
    if (
      session &&
      currentCard()?.collection === collection &&
      currentCard()?.pair === pair
    ) {
      session.phase = "question";
      session.elapsed = 0;
      session.hinted = false;
    }
    if (collection === "sounds")
      for (const id of Object.keys(state.reviews))
        if (id.startsWith("sound-pair:")) delete state.reviews[id];
    const affected =
      collection === "sounds"
        ? ["sound-first", "sound-second"]
        : collection === "words"
          ? changed.flatMap((f) => [f, "reverse-" + f])
          : collection === "edges"
            ? ["edge", "execute-edge"]
            : collection === "corners"
              ? ["corner", "execute-corner"]
              : ["ltct"];
    for (const mode of affected) delete state.reviews[`${mode}:${pair}`];
    persist();
    dialog.close();
    render();
    toast("Saved. The changed material is ready to relearn.");
  };
}
function speedPanel() {
  const metrics = [
    ["sound-first", "First-position sounds"],
    ["sound-second", "Second-position sounds"],
    ["sound-pair", "Edge sound pairs"],
    ["object", "Corner object images"],
    ["action", "Corner action images"],
  ];
  return `<div class="section-heading"><h2>Memo recall speed</h2></div><div class="speed-grid">${metrics
    .map(([mode, name]) => {
      const times = state.events
        .filter((e) => e.mode === mode && e.grade === 2 && !e.hinted)
        .slice(-20)
        .map((e) => e.elapsedMs)
        .sort((a, b) => a - b);
      const median = times.length
        ? (times[Math.floor((times.length - 1) / 2)] +
            times[Math.floor(times.length / 2)]) /
          2
        : null;
      return `<article><strong>${median === null ? "—" : (median / 1000).toFixed(1) + "s"}</strong><span>${name}</span><small>${times.length ? `${times.length} recent confident recalls` : "Practice to establish a baseline"}</small></article>`;
    })
    .join(
      "",
    )}</div><p class="muted">Median of up to 20 confident, unassisted recalls per skill. Includes your reveal tap; compare the same drill over time.</p>`;
}
function renderProgress() {
  const cards = allCards(),
    s = statsFor(state, cards),
    recent = state.events.slice(-100),
    accuracy = recent.length
      ? Math.round(
          (recent.filter((e) => e.grade > 0).length / recent.length) * 100,
        )
      : 0;
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    const key = dateKey(d);
    return {
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: state.events.filter((e) => dateKey(e.at) === key).length,
    };
  });
  const max = Math.max(5, ...days.map((d) => d.count));
  shell(
    heading(
      "SMALL STEPS ADD UP",
      "See what’s coming back.",
      "Words, recall, and execution each keep their own history.",
    ) +
      `<section class="stat-row"><article><span class="stat-icon">${icon("check")}</span><div><strong>${s.seen}</strong><span>Skill / pair combinations tried</span></div></article><article><span class="stat-icon">${icon("spark")}</span><div><strong>${accuracy}<small>%</small></strong><span>Recalled, including hints · last 100</span></div></article><article><span class="stat-icon">${icon("clock")}</span><div><strong>${state.events.length}</strong><span>Recorded attempts</span></div></article></section><section class="panel"><div class="section-heading"><h2>Your practice rhythm</h2><span class="muted">Last 14 days</span></div><div class="bar-chart" aria-label="Practice attempts over the last 14 days">${days.map((d) => `<div class="bar-column"><span>${d.count || ""}</span><div class="bar" style="height:${Math.max(3, (d.count / max) * 110)}px" title="${d.count} attempts"></div><small>${d.label}</small></div>`).join("")}</div></section>${speedPanel()}<div class="section-heading"><h2>Skill by skill</h2><span class="muted">Confidence is your latest self-rating</span></div><div class="skill-list">${Object.entries(
        MODES,
      )
        .map(([mode, m]) => {
          const st = statsFor(state, cardsFor(library, mode));
          return `<button class="skill-row" data-action="quick" data-mode="${mode}"><div><strong>${m.name}</strong><span>${st.seen} / ${st.total} explored · ${st.due} due</span></div><div class="skill-meter"><div style="width:${(st.confident / st.total) * 100}%"></div></div><span>${st.confident} confident ${icon("arrow", 16)}</span></button>`;
        })
        .join(
          "",
        )}</div><div class="section-heading"><h2>Memo practice</h2></div><div class="panel"><p>${(state.memoEvents || []).length} sequences practiced. Last 10 results:</p><div class="weak-list">${
        (state.memoEvents || [])
          .slice(-10)
          .reverse()
          .map(
            (e) =>
              `<span class="weak-chip"><strong>${e.correct}/${e.length}</strong><span>${e.delay}s delay · ${(e.studyMs / 1000).toFixed(1)}s study${e.extra ? " · extra pairs" : ""}</span></span>`,
          )
          .join("") ||
        '<span class="muted">Try a short sequence in Practice. Sequence scores stay separate from word recall.</span>'
      }</div></div><div class="section-heading"><h2>Connected practice</h2></div><div class="panel"><p>${(state.flowEvents || []).length} completed chains. Last 8 rounds:</p><div class="flow-history">${
        (state.flowEvents || [])
          .slice(-8)
          .reverse()
          .map(
            (r) =>
              `<article><strong>${r.kind === "edge" ? "Edge sounds" : "Corner images"} · ${r.correct}/${r.pairs.length} recalled${r.extra ? " · extra pairs" : ""}</strong><p>${(r.encoding.reduce((a, b) => a + b, 0) / r.pairs.length / 1000).toFixed(1)}s encoding / pair${r.cube ? ` · ${(r.retrieval.reduce((a, b) => a + b, 0) / r.pairs.length / 1000).toFixed(1)}s retrieval / case · ${(r.execution.reduce((a, b) => a + b, 0) / r.pairs.length / 1000).toFixed(1)}s turning / case` : ""}${r.assisted.some(Boolean) ? " · assisted" : ""}</p></article>`,
          )
          .join("") ||
        "<p>Try Put it together to measure a complete memo chain.</p>"
      }</div></div><div class="section-heading"><h2>Recently difficult</h2></div><div class="weak-list">${
        Object.entries(state.reviews)
          .filter(([, r]) => r.lastGrade < 2)
          .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
          .slice(0, 15)
          .map(
            ([id, r]) =>
              `<button class="weak-chip" data-action="single" data-id="${esc(id)}"><strong>${esc(id.split(":")[1])}</strong><span>${MODES[id.split(":")[0]].name} · ${label(r.lastGrade)}</span></button>`,
          )
          .join("") ||
        '<p class="muted">Your practice will reveal what deserves another look.</p>'
      }</div>`,
  );
}
function renderSettings() {
  shell(
    heading(
      "YOUR PRACTICE, YOUR DATA",
      "A space that stays yours.",
      "Everything runs on your device. No account or subscription needed.",
    ) +
      `<div class="two-col"><section class="panel"><h2>Keep a copy</h2><p>Export your edited words, review schedule, and practice history. Import the file on another device to transfer your progress.</p><button class="button" data-action="export">${icon("download")} Export backup</button><label class="file-label button secondary">Import backup<input id="import-file" type="file" accept="application/json,.json" hidden></label><p class="muted">Import replaces this device’s current data after confirmation. Back up first. Devices do not sync automatically.</p></section><section class="panel"><h2>Install & go offline</h2><p>On iPhone: open the hosted app in Safari, then Share → Add to Home Screen. On Android: use Install app in your browser menu.</p><button class="button secondary" data-action="install">${icon("download")} Install Recall</button><p id="offline-status" class="muted">${navigator.serviceWorker?.controller ? "Offline cache is active on this device." : "Open once online to prepare offline use."}</p><p class="muted">Phone installation needs the HTTPS hosted version. This local preview is for your computer.</p></section><section class="panel"><h2>Practice preferences</h2><label class="switch-row"><span>Show timer during recall<small>Time is always recorded, but never used as a correctness score.</small></span><input id="show-timer" type="checkbox" ${state.settings.showTimer ? "checked" : ""}></label><p class="muted">Switching away pauses active practice. Sessions can be resumed from Today.</p></section><section class="panel"><h2>About your imported material</h2><p>Edge memo: 22 sticker positions and 44 positional sounds from your Excel sheet. First-position and second-position sounds are trained separately.</p><p class="muted">The cube net uses U (up), D (down), L (left), R (right), F (front), and B (back). For example, UR is the sticker on the up face toward the right. Pair labels were derived from your original conversion script; review or edit them in Library → Edge sounds.</p><p>${Object.keys(base.words).length} word pairs · ${Object.keys(base.edges).length} edge cases · ${Object.keys(base.corners).length} corner cases · ${Object.keys(base.ltct).length} LTCT cases.</p><p class="muted">Existing trainer words are the defaults. Extra words and alternatives came from corner_data.json. Repeated-letter entries remain words, but are excluded from corner commutator training.</p><p class="muted">Custom labels, including Ø, are preserved. Algorithms and setups are imported references, not independently cube-verified. No tracing scheme is assumed.</p></section></div>`,
  );
}
function beginMemo(length, delay) {
  const pool = cardsFor(library, "object")
    .sort(() => Math.random() - 0.5)
    .slice(0, length);
  memo = { cards: pool, delay, phase: "study", startedAt: now(), input: "" };
  page = "memo";
  render();
}
function renderMemo() {
  let content = "";
  if (memo.phase === "study")
    content = `<p>Make a short scene with these alternating objects and actions.</p><div class="memo-pairs">${memo.cards.map((c, i) => `<div><strong>${esc(c.pair)}</strong><span>${esc(i % 2 ? c.action : c.object)}</span><small>${i % 2 ? "ACTION" : "OBJECT"}</small></div>`).join("")}</div><button class="button" data-action="hide-memo">Hide & recall ${icon("arrow")}</button>`;
  if (memo.phase === "delay")
    content = `<h2>Let the scene settle.</h2><p>Recall opens in <strong id="delay-count">${Math.ceil(Math.max(0, memo.readyAt - now()) / 1000)}</strong> seconds.</p><p class="muted">The sequence is hidden. Hold it in memory.</p>`;
  if (memo.phase === "recall")
    content = `<h2>Bring back the sequence.</h2><p>Enter the letter pairs in order, separated by spaces.</p><form id="memo-answer"><input name="answer" class="memo-input" aria-label="Recalled letter sequence" placeholder="AB CD EF" autocomplete="off" autocapitalize="characters" required><button class="button">Check sequence ${icon("arrow")}</button></form>`;
  if (memo.phase === "result") {
    const expected = memo.cards.map((c) => c.pair),
      actual = memo.input.toLocaleUpperCase().replace(/\s+/g, "");
    const tokens = actual.match(/.{1,2}/gu) || [];
    const correct = expected.filter((p, i) => p === tokens[i]).length;
    content = `<h2>${correct === expected.length && tokens.length === expected.length ? "The scene stayed with you." : "A few connections to strengthen."}</h2><p>${correct} / ${expected.length} pairs in the right position${tokens.length > expected.length ? " · extra letters entered" : ""}.</p><div class="memo-pairs">${expected.map((p, i) => `<div class="${p === tokens[i] ? "memo-correct" : "memo-wrong"}"><strong>${esc(p)}</strong><span>Your answer: ${esc(tokens[i] || "—")}</span></div>`).join("")}</div><p class="muted">Sequence results are kept separate from individual word ratings. This is a memory exercise, not a generated cube scramble.</p><button class="button" data-action="memo-again">Another sequence ${icon("arrow")}</button>`;
  }
  shell(
    `<div class="session-top"><a href="#practice">← Back to practice</a><span>Memo sequences</span></div><section class="training-card memo-card"><div class="eyebrow">MAKE THE CONNECTIONS</div>${content}</section>`,
  );
  if (memo.phase === "recall")
    setTimeout(() => $("#memo-answer input")?.focus(), 0);
}
function bind() {
  $("#flow-recall")?.addEventListener("submit", (e) => {
    e.preventDefault();
    stepConnected({
      type: "recall",
      answer: new FormData(e.target).get("answer"),
    });
  });
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (flow && page === "flow") pauseConnected(false);
      if (session && page === "session") pause(false);
      page = a.getAttribute("href").slice(1) || "today";
      history.replaceState(null, "", "#" + page);
      render();
      window.scrollTo(0, 0);
    }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => b.addEventListener("click", () => action(b.dataset)));
  $("#cube-toggle")?.addEventListener("change", (e) => {
    state.settings.cube = e.target.checked;
    persist();
    render();
  });
  $("#show-timer")?.addEventListener("change", (e) => {
    state.settings.showTimer = e.target.checked;
    persist();
  });
  $("#practice-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    let cards = cardsFor(library, f.mode);
    if (f.kind === "special") {
      if (!f.mode.includes("edge")) {
        toast("Choose Edge recall or Edge execution for your saved edge set.");
        return;
      }
      cards = cards.filter((c) => base.specialEdges.includes(c.pair));
    }
    begin(
      buildQueue(cards, state.reviews, {
        kind: f.kind,
        limit: Number(f.limit),
        letters: f.letters,
      }),
      MODES[f.mode].name,
    );
  });
  $("#memo-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    beginMemo(Number(f.get("length")), Number(f.get("delay")));
  });
  $("#memo-answer")?.addEventListener("submit", (e) => {
    e.preventDefault();
    memo.input = new FormData(e.target).get("answer");
    memo.phase = "result";
    const tokens =
      memo.input
        .toLocaleUpperCase()
        .replace(/\s+/g, "")
        .match(/.{1,2}/gu) || [];
    state.memoEvents = [
      ...(state.memoEvents || []),
      {
        at: now(),
        length: memo.cards.length,
        correct: memo.cards.filter((c, i) => c.pair === tokens[i]).length,
        extra: Math.max(0, tokens.length - memo.cards.length),
        delay: memo.delay,
        studyMs: memo.studyMs || 0,
      },
    ].slice(-5000);
    persist();
    render();
  });
  $("#library-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    const cursor = e.target.selectionStart;
    renderLibrary();
    $("#library-search").focus();
    try {
      $("#library-search").setSelectionRange(cursor, cursor);
    } catch {}
  });
  $("#import-file")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 20000000)
        throw new Error("Backup is too large (20 MB maximum).");
      const imported = validateBackup(JSON.parse(await file.text()), base);
      if (
        !confirm(
          `Replace current data with ${imported.events.length} attempts and ${Object.keys(imported.edits).length} library edits from this backup? Export your current data first if you want to keep it.`,
        )
      )
        return;
      state = imported;
      session = null;
      flow = null;
      await persist();
      render();
      toast("Backup restored.");
    } catch (error) {
      toast(error.message || "Could not read backup.");
    }
  });
}
async function action(d) {
  if (
    d.action.startsWith("flow-") ||
    ["recommended", "goal", "sound-foundation"].includes(d.action)
  ) {
    connectedAction(d);
    return;
  }
  switch (d.action) {
    case "settings":
      if (flow && page === "flow") pauseConnected(false);
      if (session && page === "session") pause(false);
      page = "settings";
      history.replaceState(null, "", "#settings");
      render();
      break;
    case "duration":
      state.settings.minutes = Number(d.value);
      persist();
      render();
      break;
    case "daily":
      startDaily();
      break;
    case "quick":
      if (d.mode === "memo") {
        page = "practice";
        render();
        $("#memo-form")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else
        begin(
          buildQueue(cardsFor(library, d.mode), state.reviews, { limit: 12 }),
          MODES[d.mode].name,
        );
      break;
    case "single": {
      const [mode] = d.id.split(":");
      begin(
        cardsFor(library, mode).filter((c) => c.id === d.id),
        "Focused review",
      );
      break;
    }
    case "filter":
      filter = d.value;
      search = "";
      render();
      break;
    case "edit":
      editEntry(d.collection, d.pair);
      break;
    case "edit-current": {
      const c = currentCard();
      if (c.mode === "sound-pair") {
        pause(false);
        page = "library";
        filter = "sounds";
        search = "";
        render();
      } else editEntry(c.collection, c.pair);
      break;
    }
    case "resume":
      page = "session";
      render();
      break;
    case "pause":
      pause();
      break;
    case "unpause":
      session.paused = false;
      session.startedAt = session.phase === "answer" ? null : now();
      if (session.remainingBudget) {
        session.endAt = now() + session.remainingBudget;
        delete session.remainingBudget;
      }
      persist();
      render();
      break;
    case "execute":
      session.phase = "executing";
      session.elapsed = 0;
      session.startedAt = now();
      persist();
      render();
      break;
    case "reveal":
      reveal();
      break;
    case "hint":
      session.hinted = true;
      persist();
      render();
      break;
    case "grade":
      grade(Number(d.grade));
      break;
    case "finish":
      finish();
      break;
    case "export": {
      const data = {
        ...state,
        session: null,
        flow: null,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `recall-backup-${dateKey(now())}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Backup exported.");
      break;
    }
    case "install":
      if (installPrompt) {
        await installPrompt.prompt();
        installPrompt = null;
      } else
        toast(
          "Use your browser’s Share or menu button, then Add to Home Screen / Install app.",
        );
      break;
    case "hide-memo":
      memo.studyMs = now() - memo.startedAt;
      memo.phase = memo.delay ? "delay" : "recall";
      memo.readyAt = now() + memo.delay * 1000;
      render();
      break;
    case "memo-again":
      beginMemo(memo.cards.length, memo.delay);
      break;
  }
}
window.addEventListener("hashchange", () => {
  if (flow && page === "flow") pauseConnected(false);
  if (session && page === "session") pause(false);
  page = location.hash.slice(1) || "today";
  render();
  window.scrollTo(0, 0);
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && flow && page === "flow" && !flow.paused)
    pauseConnected(false);
  if (document.hidden && session && page === "session" && !session.paused)
    pause(false);
});
document.addEventListener("keydown", (e) => {
  if (
    document.querySelector("dialog[open]") ||
    e.repeat ||
    /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)
  )
    return;
  if (page === "flow" && flow && !flow.paused) {
    if (
      e.code === "Space" &&
      ["ready", "encode", "retrieve", "execute"].includes(flow.phase)
    ) {
      e.preventDefault();
      stepConnected({ type: "next" });
    }
    if (flow.phase === "grade" && ["1", "2", "3"].includes(e.key))
      stepConnected({ type: "grade", grade: Number(e.key) - 1 });
    if (e.key === "Escape") pauseConnected();
    return;
  }
  if (page === "session" && session && !session.paused) {
    if (e.code === "Space") {
      e.preventDefault();
      reveal();
    }
    if (["1", "2", "3"].includes(e.key)) grade(Number(e.key) - 1);
    if (e.key === "Escape") pause();
  }
});
setInterval(() => {
  if (
    page === "session" &&
    session?.startedAt &&
    !session.paused &&
    $("#live-timer")
  )
    $("#live-timer").textContent =
      ((session.elapsed + now() - session.startedAt) / 1000).toFixed(1) + "s";
  if (page === "memo" && memo?.phase === "delay") {
    if (now() >= memo.readyAt) {
      memo.phase = "recall";
      render();
    } else if ($("#delay-count"))
      $("#delay-count").textContent = Math.ceil((memo.readyAt - now()) / 1000);
  }
}, 100);
function startConnected(kind, cube = state.settings.cube) {
  if (session && page === "session") pause(false);
  try {
    flow = createFlow(library, kind, cube);
    page = "flow";
    persist();
    render();
    window.scrollTo(0, 0);
  } catch (error) {
    toast(error.message);
  }
}
function stepConnected(event) {
  if (!flow) return;
  flow = advanceFlow(flow, event, now());
  if (flow.phase === "result" && !flow.saved) {
    state.flowEvents = [
      ...(state.flowEvents || []),
      flowResult(flow, now()),
    ].slice(-5000);
    flow.saved = true;
  }
  persist();
  render();
  window.scrollTo(0, 0);
}
function pauseConnected(leave = true) {
  if (!flow) return;
  flow = pauseFlow(flow, now());
  persist();
  if (leave) page = "today";
  render();
}
function startSoundFoundation() {
  const first = buildQueue(cardsFor(library, "sound-first"), state.reviews, {
    limit: 6,
  });
  const second = buildQueue(cardsFor(library, "sound-second"), state.reviews, {
    limit: 6,
  });
  const queue = first.flatMap((c, i) => [c, second[i]]).filter(Boolean);
  begin(queue, "Individual edge sounds");
}
function connectedAction(d) {
  if (d.action === "goal") {
    practiceGoal = d.goal;
    page = "practice";
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (d.action === "recommended") {
    const r = recommendation(state);
    if (r.type === "sounds") startSoundFoundation();
    else if (r.type === "flow") startConnected(r.kind);
    else
      begin(
        buildQueue(cardsFor(library, r.mode), state.reviews, { limit: 12 }),
        MODES[r.mode].name,
      );
    return;
  }
  if (d.action === "sound-foundation") {
    startSoundFoundation();
    return;
  }
  if (d.action === "flow-start") {
    startConnected(d.mode);
    return;
  }
  if (!flow) return;
  if (d.action === "flow-next") stepConnected({ type: "next" });
  if (d.action === "flow-hint") stepConnected({ type: "hint" });
  if (d.action === "flow-grade")
    stepConnected({ type: "grade", grade: Number(d.grade) });
  if (d.action === "flow-pause") pauseConnected();
  if (d.action === "flow-resume") {
    page = "flow";
    render();
  }
  if (d.action === "flow-unpause") {
    flow = resumeFlow(flow, now());
    persist();
    render();
  }
  if (d.action === "flow-again") startConnected(flow.kind, flow.cube);
  if (d.action === "flow-done") {
    flow = null;
    persist();
    page = "today";
    render();
  }
}
try {
  const response = await fetch("./data/library.json");
  if (!response.ok) throw new Error("Library could not be loaded.");
  base = await response.json();
  try {
    await openStore();
    state = (await load()) || emptyState();
  } catch {
    state = emptyState();
    saveError = true;
    storageAvailable = false;
  }
  library = libraryFor(base, state.edits);
  state.flowEvents ??= [];
  flow = state.flow || null;
  if (flow) flow = pauseFlow(flow, now());
  session = state.session || null;
  if (session) {
    session.paused = true;
    session.startedAt = null;
  }
  page = location.hash.slice(1) || "today";
  render();
  if ("serviceWorker" in navigator)
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => toast("Offline caching is unavailable in this browser."));
} catch (error) {
  $("#app").innerHTML =
    `<main class="loading"><h1>Couldn’t open Recall.</h1><p>${esc(error.message)}</p><p>Try reopening while online. Use the local server instead of opening index.html directly.</p><button onclick="location.reload()">Try again</button></main>`;
}
