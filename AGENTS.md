# Agent instructions for this fork

Before working, read `HANDOFF.md` if it exists (current state, decisions and next steps; it is local-only and may be absent on GitHub). Update it when you finish.

This is a fork of [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) (MIT), extended for Colombia. Upstream's rules apply; read `CONTRIBUTING.md` and `docs/CODE-BOUNDARIES.md` first.

## Rules

- **Checks before every commit:** `npm test`, `npm run check:boundaries`, `npm run format:check`, and `npm run build` for build-affecting changes. Report failures honestly with their output.
- **Known flaky tests:** `src/data/localReceiversProxy.test.mjs` and `src/layers/streetLevel/meshSampler.test.mjs` time out under load; rerun them alone before treating a failure as real.
- **Windows:** Node reports the machine's locale (`es-ES` on the owner's PC). Never let a test depend on `navigator.language` or path separators; inject them.
- **Secrets:** never write API keys, tokens or personal data into files, commits or logs. Keys live only in `.env` or `pinokio/ENVIRONMENT` (both git-ignored).
- **Bundled data:** load JSON packs with `loadBundledJson(new URL(...))` from `src/data/bundledJson.js`, never `import(...json)`. Record license and attribution in `DATA_SOURCES.md` and a folder `README.md`.
- **New modules** in an export group must be added to `scripts/package-boundaries.json` (insert lines; do not reformat the file).
- **The line:** no face recognition, plate reading, or tracking of individuals. Only data the provider publishes openly or that the owner has permission to use.
- **Private folder:** `my-study-guide/` is the owner's personal guide. It is git-ignored on purpose. Never commit or push it.
- Explain changes step by step for a learning owner, and mark unverified claims as such.
