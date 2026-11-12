import { MODES } from "./engine.js";
import { recommendation, flowElapsed } from "./training.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const seconds = (v) => (v / 1000).toFixed(1) + "s";
const sum = (a) => a.reduce((n, x) => n + x, 0);
export function stickerNet(selected) {
  const layout = {
    U: ["", "UB", "", "UL", "U", "UR", "", "UF", ""],
    L: ["", "LU", "", "LB", "L", "LF", "", "LD", ""],
    F: ["", "FU", "", "FL", "F", "FR", "", "FD", ""],
    R: ["", "RU", "", "RF", "R", "RB", "", "RD", ""],
    B: ["", "BU", "", "BR", "B", "BL", "", "BD", ""],
    D: ["", "DF", "", "DL", "D", "DR", "", "DB", ""],
  };
  return `<div class="cube-net" role="img" aria-label="Cube net highlighting the ${esc(selected)} sticker"><div class="net-spacer"></div>${["U", "L", "F", "R", "B", "D"].map((face) => `<div class="net-face face-${face}">${layout[face].map((v) => `<span class="net-cell ${v === selected ? "target" : ""} ${v === face ? "face-center" : ""}">${v === selected ? "●" : v === face ? face : ""}</span>`).join("")}</div>`).join("")}</div>`;
}
export function objectiveFor(card) {
  if (MODES[card.mode].group === "Sounds") return MODES[card.mode].description;
  if (card.mode === "object")
    return "See the pair, recall your object, and picture it clearly. Tap Reveal as soon as the image is there.";
  if (card.mode === "action")
    return "See the pair and imagine its action happening. Tap Reveal when the action is clear.";
  if (card.mode.startsWith("reverse-"))
    return "Recover the two letters from this word. Say the pair before revealing it.";
  if (MODES[card.mode].cube)
    return "Prepare your cube. Start the timer, execute the algorithm from memory, then check your moves.";
  return "Recall the setup and commutator from this pair. Reveal only once you have it, or use a hint to relearn.";
}
export function homeView(state, session, flow) {
  const r = recommendation(state);
  const due = Object.values(state.reviews).filter(
    (x) => x.due <= Date.now(),
  ).length;
  return `<div class="page-heading"><div><div class="eyebrow">YOUR NEXT STEP</div><h1>Know what to practice.</h1><p>A short session with one clear goal. Start here, then let your results guide the next one.</p></div></div>
 ${flow ? `<div class="resume-bar"><div><strong>Continue your ${flow.kind} chain</strong><p>Your round is paused and saved.</p></div><button class="button" data-action="flow-resume">Continue round</button></div>` : session ? `<div class="resume-bar"><div><strong>Continue ${esc(session.title)}</strong><p>${session.index} prompts completed.</p></div><button class="button" data-action="resume">Continue session</button></div>` : ""}
 <section class="recommendation"><div><span class="recommend-label">RECOMMENDED FOR YOU</span><h2>${r.title}</h2><p>${r.why}</p><div class="recommend-meta"><span>About 3–5 minutes</span><span>${(r.type === "flow" && state.settings.cube) || (r.type === "single" && MODES[r.mode]?.cube) ? "Cube needed" : "No cube needed"}</span></div><button class="button primary large" data-action="recommended">Start recommended practice <span aria-hidden="true">→</span></button></div><div class="recommend-steps" aria-label="Learning path"><div><b>1</b><span>Recall your cues</span></div><div><b>2</b><span>Join them into memo</span></div><div><b>3</b><span>Carry memo into moves</span></div></div></section>
 <label class="equipment"><input id="cube-toggle" type="checkbox" ${state.settings.cube ? "checked" : ""}><span>I have my cube with me<small>Recommendations can include physical execution.</small></span></label>
 <div class="section-heading"><h2>Or choose your goal</h2><span>${due} individual reviews due</span></div>
 <div class="goal-grid"><button class="goal-card memo-goal" data-action="goal" data-goal="memo"><span class="goal-symbol">Aa</span><h3>Faster memo</h3><p>Instant edge sounds and vivid corner images.</p><strong>Practice memo →</strong></button><button class="goal-card exec-goal" data-action="goal" data-goal="execution"><span class="goal-symbol">↻</span><h3>Smoother execution</h3><p>Remember your algorithms and make the moves fluent.</p><strong>Practice execution →</strong></button><button class="goal-card flow-goal" data-action="goal" data-goal="flow"><span class="goal-symbol">⇢</span><h3>Put it together</h3><p>One sequence, from sounds or images to recall and moves.</p><strong>Practice a connected chain →</strong></button></div>
 <p class="home-footnote">Your progress stays on this device. Short, accurate practice comes before speed.</p>`;
}
const drill = (title, text, action, mode, tag) =>
  `<article class="drill-choice"><span class="drill-tag">${tag}</span><h2>${title}</h2><p>${text}</p><button class="button" data-action="${action}" data-mode="${mode}">Start ${title.toLowerCase()} →</button></article>`;
export function practiceView(state, goal = "memo") {
  let choices = "";
  if (goal === "memo")
    choices =
      drill(
        "Edge sound pairs",
        "See two targets. Blend the first-position and second-position sounds immediately.",
        "quick",
        "sound-pair",
        "EDGE MEMO",
      ) +
      drill(
        "Corner images",
        "Recall and visualize your personal object words. Speed is recorded separately from correctness.",
        "quick",
        "object",
        "CORNER MEMO",
      ) +
      `<div class="practice-tip"><strong>Still relearning the sounds?</strong><p>Start with each position separately before combining them.</p><button class="button secondary" data-action="sound-foundation">Practice individual edge sounds</button></div>`;
  if (goal === "execution")
    choices =
      drill(
        "Edge execution",
        "Set up a case on your cube, retrieve the algorithm, then execute.",
        "quick",
        "execute-edge",
        "CUBE NEEDED",
      ) +
      drill(
        "Corner execution",
        "Practice your corner commutators, focusing on accurate, fluid moves.",
        "quick",
        "execute-corner",
        "CUBE NEEDED",
      ) +
      `<div class="practice-tip"><strong>No cube nearby?</strong><p>Rehearse the moves mentally with algorithm recall.</p><button class="button secondary" data-action="quick" data-mode="edge">Edge recall</button> <button class="button secondary" data-action="quick" data-mode="corner">Corner recall</button></div>`;
  if (goal === "flow")
    choices =
      `<p class="flow-intro">Stay with the same three pairs through the whole exercise. Encode them without looking up the cues, recover the sequence, and optionally execute it from memory.</p><label class="equipment"><input id="cube-toggle" type="checkbox" ${state.settings.cube ? "checked" : ""}><span>Include cube execution<small>Measures algorithm retrieval and turning separately, with uninterrupted transitions between cases.</small></span></label>` +
      drill(
        "Edge chain",
        "Blend your positional sounds into a short memo sequence. Hold it in memory, then recover the targets.",
        "flow-start",
        "edge",
        state.settings.cube
          ? "MEMO → RETRIEVE → EXECUTE"
          : "ENCODE → REMEMBER → RECALL",
      ) +
      drill(
        "Corner chain",
        "Turn alternating objects and actions into a scene, then recover and use the same sequence.",
        "flow-start",
        "corner",
        state.settings.cube
          ? "MEMO → RETRIEVE → EXECUTE"
          : "ENCODE → REMEMBER → RECALL",
      );
  return `<div class="page-heading"><div><div class="eyebrow">ONE GOAL AT A TIME</div><h1>Choose what to improve.</h1><p>The sessions below are ready to start. More specific drills are tucked away underneath.</p></div></div><div class="goal-tabs" role="group" aria-label="Practice goal">${[
    ["memo", "Faster memo"],
    ["execution", "Smoother execution"],
    ["flow", "Put it together"],
  ]
    .map(
      ([id, name]) =>
        `<button aria-pressed="${goal === id}" data-action="goal" data-goal="${id}" class="${goal === id ? "active" : ""}">${name}</button>`,
    )
    .join("")}</div><div class="drill-grid">${choices}</div>
 <details class="advanced-practice"><summary>All individual drills & custom practice</summary><p>Every drill is still here when you need a specific focus.</p><form id="practice-form"><div class="form-grid"><label>Practice skill<select name="mode">${Object.entries(
   MODES,
 )
   .map(([id, m]) => `<option value="${id}">${m.name}</option>`)
   .join(
     "",
   )}</select></label><label>Focus<select name="kind"><option value="balanced">Due + relearn + maintenance</option><option value="due">Due reviews only</option><option value="weak">Previously difficult</option><option value="special">Saved special-edge set</option></select></label><label>Prompts<input name="limit" type="number" value="12" min="5" max="100" required></label><label>Starting letters (optional)<input name="letters" placeholder="All · Ø supported" maxlength="50"></label></div><button class="button" type="submit">Start custom session</button></form><hr><h3>Longer memo retention</h3><form id="memo-form"><div class="form-grid"><label>Pairs<select name="length">${[2, 3, 4, 5, 6, 8].map((n) => `<option ${n === 3 ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Recall delay<select name="delay"><option value="0">No delay</option><option value="5" selected>5 seconds</option><option value="15">15 seconds</option><option value="30">30 seconds</option></select></label></div><button class="button secondary" type="submit">Practice memo retention</button></form><hr><h3>Mixed daily review</h3><p>Keep the original mixed practice session for reviewing different individual skills.</p><button class="button secondary" data-action="daily">Start mixed review</button></details>`;
}
export function flowView(f) {
  const c = f.cards[f.index],
    n = f.cards.length;
  const title = f.kind === "edge" ? "Edge chain" : "Corner chain";
  const phaseName = {
    ready: "Get ready",
    encode: "Build the memo",
    recall: "Recover the sequence",
    retrieve: "Recall the next algorithm",
    execute: "Execute from memory",
    grade: "Check your execution",
    result: "Round complete",
  }[f.phase];
  const steps = f.cube
    ? ["Encode", "Recall", "Retrieve & execute", "Check"]
    : ["Encode", "Recall", "Check"];
  const index = {
    ready: 0,
    encode: 0,
    recall: 1,
    retrieve: 2,
    execute: 2,
    grade: 3,
    result: steps.length - 1,
  }[f.phase];
  let body = "";
  if (f.paused)
    body = `<h2>Round paused</h2><p>Timing has stopped. Continue when you are ready.</p><button class="button" data-action="flow-unpause">Continue round</button>`;
  else if (f.phase === "ready")
    body = `<h2>Three pairs. One connected exercise.</h2><ol class="flow-instructions"><li><strong>Encode:</strong> ${f.kind === "edge" ? "See each pair and blend its sounds." : "See each pair and form its object or action image."} Tap as soon as the cue is clear.</li><li><strong>Remember:</strong> Hide the targets and type the sequence from memory.</li>${f.cube ? "<li><strong>Execute:</strong> Recall the algorithm for each remembered pair, tap as you start turning, and tap when finished. The next retrieval timer starts immediately.</li>" : ""}<li><strong>Check:</strong> See the cues and ${f.cube ? "algorithms" : "correct sequence"}, with separate timing for each skill.</li></ol>${f.cube ? '<p class="callout">Start on any cube and execute the algorithms in order. This is a fluency drill, not a scramble that finishes solved. Correctness is self-graded after all cases.</p>' : ""}<button class="button large" data-action="flow-next">Start encoding →</button>`;
  else if (f.phase === "encode")
    body = `<div class="exercise-objective"><strong>Your objective</strong><p>${f.kind === "edge" ? "Say the first target’s first sound joined to the second target’s second sound. Add it to your spoken memo." : `Form the ${c.role} image for this pair and link it to the scene so far.`} Tap as soon as it is clear.</p></div><div class="target-counter">Pair ${f.index + 1} of ${n} · ${c.role.toUpperCase()}</div><h2 class="pair-prompt">${esc(c.pair)}</h2>${f.hinted ? `<div class="answer-box"><p class="answer">${esc(c.cue)}</p><p>Hint used — this round will be marked assisted.</p></div>` : ""}<button class="button large" data-action="flow-next">${f.kind === "edge" ? "Sound encoded" : "Image formed"} →</button><button class="text-button" data-action="flow-hint">Show my ${f.kind === "edge" ? "sound" : "word"}</button>`;
  else if (f.phase === "recall")
    body = `<div class="exercise-objective"><strong>Your objective</strong><p>Recover the letters from your ${f.kind === "edge" ? "sound memo" : "scene"}, in order. ${f.cube ? "Keep the sequence in mind: you will execute it next without seeing the answers." : ""}</p></div><form id="flow-recall"><label>Recalled letter pairs<input name="answer" class="memo-input" placeholder="AB CD EF" autocomplete="off" autocapitalize="characters" required maxlength="60"></label><button class="button large">${f.cube ? "Keep answers hidden & execute" : "Check my memo"} →</button></form>`;
  else if (f.phase === "retrieve")
    body = `<div class="exercise-objective"><strong>Your objective</strong><p>Recover pair ${f.index + 1} from your memo and recall its algorithm. Tap “Ready to turn” as you begin the first move.</p></div><h2 class="hidden-target">Target ${f.index + 1} <small>of ${n}</small></h2><p>The original letters and cues stay hidden.</p>${f.hinted ? `<div class="answer-box"><h3>${esc(c.pair)} · ${esc(c.cue)}</h3><p class="alg">${esc(c.algorithm)}</p></div>` : ""}<button class="button large" data-action="flow-next">Ready to turn →</button><button class="text-button" data-action="flow-hint">I need the target and algorithm</button>`;
  else if (f.phase === "execute")
    body = `<div class="exercise-objective"><strong>Your objective</strong><p>Execute the algorithm you recalled. Tap once the last move is complete${f.index < n - 1 ? ", then immediately recall the next target" : ""}.</p></div><h2 class="hidden-target">Execute ${f.index + 1} <small>of ${n}</small></h2><div class="execution-pulse" aria-hidden="true"></div><button class="button large" data-action="flow-next">Case finished${f.index < n - 1 ? " · next target" : " · review round"} →</button>`;
  else if (f.phase === "grade")
    body = `<p class="target-counter">Check case ${f.index + 1} of ${n} · timing has stopped</p><h2 class="pair-prompt">${esc(c.pair)}</h2><div class="answer-box"><p class="answer">${esc(c.cue)}</p><p class="alg">${esc(c.algorithm)}</p></div><p>Did you execute this algorithm correctly from memory?</p><div class="grade-buttons">${["Incorrect", "Hesitated", "Clean"].map((s, i) => `<button data-action="flow-grade" data-grade="${i}">${s}</button>`).join("")}</div>`;
  else if (f.phase === "result") {
    const correct = f.cards.filter(
      (card, i) => card.pair === f.decoded[i],
    ).length;
    body = `<h2>${correct === n && f.decoded.length === n ? "The sequence came back." : "Here’s where to focus next."}</h2><p>${correct} / ${n} pairs recalled in order${f.decoded.length > n ? " · extra pairs entered" : ""}. ${f.assisted.some(Boolean) ? "Assisted round: hints were used." : "No hints used."}</p><div class="flow-metrics"><div><strong>${seconds(sum(f.encoding) / n)}</strong><span>Encoding / pair</span></div><div><strong>${seconds(f.recallMs)}</strong><span>Sequence recall + typing</span></div>${f.cube ? `<div><strong>${seconds(sum(f.retrieval) / n)}</strong><span>Retrieval / case</span></div><div><strong>${seconds(sum(f.execution) / n)}</strong><span>Turning / case</span></div>` : ""}</div><div class="flow-results">${f.cards.map((card, i) => `<article><strong>${esc(card.pair)} <span class="${card.pair === f.decoded[i] ? "correct-text" : "incorrect-text"}">${card.pair === f.decoded[i] ? "✓" : `You entered ${esc(f.decoded[i] || "—")}`}</span></strong><p>${esc(card.cue)}</p><small>Encode ${seconds(f.encoding[i])}${f.cube ? ` · Retrieve ${seconds(f.retrieval[i])} · Turn ${seconds(f.execution[i])} · ${["Incorrect", "Hesitated", "Clean"][f.grades[i]]}` : ""}${f.assisted[i] ? " · Hint used" : ""}</small></article>`).join("")}</div><p class="callout">${correct < n ? "Practice your cue recall before trying to go faster." : f.cube && f.grades.includes(0) ? "Focus on accurate algorithm execution before reducing the pauses." : f.cube && sum(f.retrieval) > sum(f.execution) ? "Retrieval took longer than turning. Try algorithm recall, then repeat a chain." : "Repeat a short chain and aim for clearer cues with less hesitation."} Timing includes your button taps; compare it with your own previous rounds.</p><div class="flow-end-actions"><button class="button" data-action="flow-again">Another round</button><button class="button secondary" data-action="flow-done">Finish practice</button></div>`;
  }
  return `<div class="session-top"><button class="text-button" data-action="flow-pause">← Pause & leave</button><strong>${title}</strong><span>${f.cube ? "With cube" : "Memo only"}</span></div><div class="flow-steps">${steps.map((s, i) => `<span class="${i === index ? "current" : ""}"><b>${i + 1}</b>${s}</span>`).join("")}</div><section class="training-card flow-card"><header class="exercise-heading"><span class="drill-tag">CONNECTED PRACTICE</span><h1>${phaseName}</h1></header>${body}</section>`;
}
