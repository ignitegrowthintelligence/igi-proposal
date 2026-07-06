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
