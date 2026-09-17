# igi-proposal — IGI Proposal Builder (frontend)

> Suite-wide context: `../IGI-SUITE.md`. Read that first.

**What this is:** proposal generation with two entry points — RFP paste (`rfpText`) and Discovery-fed. 7-element discovery capture (objective/KPI/USP/audience/budget), deterministic budget model, revenue-KPI tier solver, Projected Outcomes card, PPTX export with tier slide.

- **Frontend:** GitHub Pages · deploy = `git push`
- **Backend:** `proposal.js` in `igi-intel-engine` (all generation + outcome routes) — pattern mirrors `discovery.js`
- **`GET /proposal/:id` is an INTENTIONAL public share link** (self-gated by `shareLinkEnabled`) — it is on the engine's auth allowlist by design; don't "fix" it.

## Notes
- Repo history: main was untangled/synced with master content 2026-07-03 — work on `main`.
- Categories come from the canonical Supabase list; "Other" has a free-text description field.
- Tier math conventions (AdMall → ad_response) are documented in the suite-fixes memory/spec — don't re-derive.
- Feature-level changes: append one line to `../igi-docs/IGI_Changelog.md`.

## Landmines (learned 2026-09-16)
- **`/proposal/generate` returns `{ proposalContext, sections }` with the RFP list at `sections.rfpSections`.** The page read `result.rfpSections` from 2026-07-07 until 2026-09-16, so no real RFP ever reached the Build Workspace; every earlier "live verified" test had injected `S.rfpSections` by hand. Verify RFP builds through `proceedToBuild()` with a real or exact-shape generate response, never by setting state.
- **The page source is public and carries `INTEL_SECRET`.** Treat anything an engine route returns as readable by anyone. Never return signed storage links or full tax IDs from a route this page calls. Library files stay behind the Library login.
- Git on the Cowork VM mount: use `git --no-optional-locks` for status/diff so it doesn't leave `index.lock` behind.
- **RFP Draft screen (v3, 2026-09-16):** `buildItems()` turns sections and requirements into items with a `kind` (text, table, doc, link, security, locked, team, files, pricing, submission, deadline). Merged kinds (`submission`, `terms`, `cyber`, `company`, `team`, `cases`, `pricing`) keep their state in `qualification._v3[id]`; the rest keep it on their section or requirement. "Reviewed" (`itemReviewed`) is the only status; `_status`/`_forceComplete`/`_done` from older saves are read, never written. Detection (`detectFormat`, `pricingDetect`) is code over the RFP text and must show its sentence. On the Cowork VM the working tree shows every line changed (CRLF vs LF index), so check with `git diff --ignore-cr-at-eol` and commit from Windows.
