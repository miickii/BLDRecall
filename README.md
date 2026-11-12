# Recall — personal 3BLD practice

An offline-first, installable practice app built from your existing trainers. The original project folders are unchanged. All app assets and your imported library are inside this directory. There are no runtime dependencies, external fonts, accounts, paid APIs, or backend services.

## Version 2: guided practice and connected drills

The home screen now offers one recommendation and three goals: **Faster memo**, **Smoother execution**, and **Put it together**. The original individual drills, filters, LTCT, memo retention, and mixed daily review remain under **Practice → All individual drills & custom practice**. Recommendations begin with sound foundations, then sound pairs and corner images, and finally connected chains; due reviews take priority when there are at least five. The cube toggle prevents recommendations for physical execution when no cube is available.

Exercise titles and objectives are larger, with higher-contrast navy, blue, teal, and amber colors. Revealing a positional sound hides its cube diagram so the answer and grading controls are easier to reach on a phone.

### Edge sounds

The app imports 22 sticker positions / 44 positional sounds from `Edge sounds.xlsx`, `Sheet1!A5:L13`. The first sound in each cell is used when that sticker is first in a pair; the second sound is used when it is second. Whitespace around the slash is removed; phonetic spellings are unchanged.

- **Individual edge sounds** alternates first/second positions and shows a highlighted sticker on a cube net.
- **Edge sound pairs** combines the first target’s first sound and the second target’s second sound. A dot separates the components; say them together in your usual pronunciation. The app does not synthesize audio or automatically judge pronunciation.
- **Library → Edge sounds** lets you edit sounds and their positional pair labels. The positions are interpreted from the workbook’s U/L/F/R/B/D face centers. Pair labels are derived from the original `cube.py` scheme and `file_creation.py` conversions, not guessed from the sound spelling. All 440 existing edge pairs resolve under this mapping. Review these mappings if your physical lettering scheme has changed. Duplicate labels within a position are rejected.
- Sound edits reset the affected positional reviews and derived sound-pair reviews. Existing logs are retained. The workbook itself is not modified.

### Connected chains

**Practice → Put it together** has edge and corner chains with three algorithm-backed pairs. Choose whether to include a cube.

1. Encode one pair at a time without seeing the expected sound/image. Form the sound or image, add it to the chain, and tap when ready. Corner chains alternate object/action cues. Hints mark the round as assisted.
2. The entire sequence is hidden. Type the recalled letters. With cube execution enabled, correctness feedback stays hidden until after execution.
3. Retrieve each target and its algorithm from your own memo. Tap **Ready to turn** as you start, then **Case finished** at the last move. The next retrieval phase starts immediately, without intervening grading.
4. After all cases, grade each execution. Results show individual encoding, retrieval, and turning times, sequence correctness, and assistance. Sequence recall time includes typing. Manual timestamps include button overhead and are useful for comparing your own repeated attempts, not automatic TPS measurement.

This is a fluency sequence, **not a generated scramble that returns to solved**. Start on any cube. Execution correctness is self-reported; the app does not observe the cube. Algorithms are imported references. Chain scores remain separate from individual SRS cards so a failed sequence never marks every constituent pair as forgotten.

Connected rounds pause when you navigate away or background the tab, and resume after reload. Progress includes chain history and median recall times for up to 20 recent confident, unassisted attempts per memo skill. Chain history retains the latest 5,000 rounds. Older v1 backups still import; new backups include sounds and completed chain results. Active round timers are excluded from backup transfers.

### Updating the installed app

Push the changed source files in this repository to `main` to run the existing GitHub Pages workflow. The service-worker cache version has been updated and new modules are included in offline caching. After deployment, open the app online, then fully close all its browser tabs/home-screen windows and reopen it to activate the downloaded version. Progress stays in IndexedDB; do not clear site data. No re-import is needed for existing progress.

## Run locally

Requires Node.js 20 or newer. No `npm install` is needed.

```sh
cd /Users/micki/LocalDocuments/Programmering/Cubing/3BLD/BLDRecall
npm run dev
```

Open http://localhost:4173. Use `PORT=4174 npm run dev` if that port is busy. Stop the server with Ctrl+C. Opening index.html as a file is not supported because the app loads its library and service worker over HTTP.

## Practice

- **Today:** start the recommended short session or choose a practice goal. The cube toggle adjusts recommendations. The original mixed daily review remains available in advanced practice.
- **Practice:** object words, action words, both reverse directions, edge/corner algorithm recall, edge/corner execution, and LTCT recall. Filter by due reviews, previous difficulty, starting letters (including Ø), or your saved special-edge set.
- **Memo sequences:** study 2–8 alternating object/action pairs, hide them, optionally wait 5–30 seconds, then type the pairs. Results are stored separately from individual word recall. These are word sequences, not generated cube scrambles.
- **Library:** search and edit your material. Older conflicting words are available as alternatives. Changed answers reset only the affected review records, while retaining the attempt log.
- **Progress:** daily activity, independent coverage for every skill, recently difficult pairs, and recent memo sequence results.
- **Settings:** export/import backups, installation instructions, and an optional visible timer.

Recall is graded **Forgot / Hesitated / Confident**. Execution uses **Incorrect / Hesitated / Clean**. Speed never marks a correct answer wrong. A hint caps the effective grade at Hesitated. A forgotten card returns after up to three intervening prompts once per session; near the end it may return sooner. Longer-term reviews use a transparent interval scheduler: forgotten 10 minutes, first hesitant 6 hours, first confident 1 day, then expanding confident intervals up to 180 days. This is a simple scheduler, not FSRS.

Keyboard shortcuts: Space reveals (or starts/finishes execution); 1/2/3 grade; Escape pauses. Shortcuts are ignored while typing or while a dialog is open. Switching away from the tab pauses an active session. Saved sessions resume paused from Today. Unfinished memo sequences are not restored.

## Your data

- 399 word pairs. The 383 entries used by the previous web/desktop trainers remain the defaults. Sixteen additional entries came from `CommTrainerWeb/corner_data.json`; eight entries have differing saved object or action words, preserved as alternatives.
- 440 edge cases; 378 corner cases; 252 LTCT cases.
- Corner entries DD, FF, PP, AA, and MM are retained as words but excluded from commutator training because their repeated-letter keys should not automatically represent distinct three-cycle cases.
- Special edges come from `CommTrainerWeb/edges_pairs_to_practice.txt`, restricted to keys present in the imported edge library.
- The existing dataset labels are preserved exactly. The Python cube scheme and converted datasets disagree, so the app does not assume a sticker mapping or generate traced scrambles.
- Algorithms and setups are imported references and have **not been independently verified by a cube simulator**. Physical execution is self-graded. Validate an imported setup before using it to assess execution.

Progress and edits are stored in IndexedDB on the current browser/device. Browser data removal can erase them: export a backup regularly. Import replaces current progress after confirmation and does not merge multiple device histories. The attempt log retains the latest 30,000 attempts and memo history the latest 5,000 sequences. An exported backup deliberately excludes the active session timer.

The app bundles your personal word list. A public deployment makes that bundled list public too. If you want it private, replace the bundled personal words before publishing; exporting progress does not remove the words from the shipped library. Local progress and edits are not uploaded.

## Free phone installation with GitHub Pages

1. Create a new **public** GitHub repository and put the contents of this folder at its root. Do not upload the parent directory of old projects or personal backup files.
2. Push to its `main` branch.
3. In repository Settings → Pages, choose **GitHub Actions** as the source.
4. The included `.github/workflows/pages.yml` runs tests, builds `dist/`, and publishes it.
5. Open the resulting `https://YOUR-NAME.github.io/REPOSITORY/` URL on your phone.
6. iPhone: Safari → Share → Add to Home Screen. Android: browser menu → Install app / Add to Home Screen.
7. Let the initial page finish loading online. After the service worker caches the app, practice works offline.

GitHub Pages supplies the HTTPS address; a purchased domain or app-store account is unnecessary. Hosting is not deployed by the local build. Install support depends on the browser; actual device installation should be checked on your phone.

## Build and check

```sh
npm test
npm run build
```

The generated `dist/` directory is a self-contained static site. Paths are relative, so repository subpaths work. The app uses native browser JavaScript modules rather than a framework: this keeps installation and hosting simple and avoids dependency maintenance for a personal app.

When changing deployed assets, increment the `CACHE` version in `sw.js` before deployment. An updated worker activates after all old app tabs/windows close, so it never replaces code halfway through a session. Close and reopen the app to receive the new cached version. Device progress lives outside the cache and survives app updates.

## Project layout

- `src/app.js`: UI, practice sessions, memo practice, backup flow.
- `src/engine.js`: independent training cards, queue selection, scheduling, validation.
- `src/training.js`: sound composition, connected-round transitions, timing, and recommendations.
- `src/experience.js`: guided home/practice and connected-drill views.
- `src/refresh.css`: accessible version-2 visual design.
- `src/storage.js`: IndexedDB persistence.
- `src/styles.css`: responsive layout, mobile navigation, accessible focus states.
- `data/library.json`: imported words/algorithms with alternatives and provenance notes.
- `sw.js`, `manifest.webmanifest`, `icons/`: offline and install support.
- `tests/engine.test.mjs`: core training, import, and PWA asset checks.

Future work: verified cube-state generation and tracing, configurable sticker schemes, algorithm-family tagging, solve-error logging, and automatic device sync. Those are not simulated by the current version.
