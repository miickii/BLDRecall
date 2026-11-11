# Recall — personal 3BLD practice

An offline-first, installable practice app built from your existing trainers. The original project folders are unchanged. All app assets and your imported library are inside this directory. There are no runtime dependencies, external fonts, accounts, paid APIs, or backend services.

## Run locally

Requires Node.js 20 or newer. No `npm install` is needed.

```sh
cd /Users/micki/LocalDocuments/Programmering/Cubing/3BLD/BLDRecall
npm run dev
```

Open http://localhost:4173. Use `PORT=4174 npm run dev` if that port is busy. Stop the server with Ctrl+C. Opening index.html as a file is not supported because the app loads its library and service worker over HTTP.

## Practice

- **Today:** choose a 5, 10, or 15-minute budget and whether you have a cube. The suggested session mixes due reviews with unfamiliar material. The timer budget ends after a graded prompt, never mid-answer.
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
- `src/storage.js`: IndexedDB persistence.
- `src/styles.css`: responsive layout, mobile navigation, accessible focus states.
- `data/library.json`: imported words/algorithms with alternatives and provenance notes.
- `sw.js`, `manifest.webmanifest`, `icons/`: offline and install support.
- `tests/engine.test.mjs`: core training, import, and PWA asset checks.

Future work: verified cube-state generation and tracing, configurable sticker schemes, algorithm-family tagging, solve-error logging, and automatic device sync. Those are not simulated by the current version.
