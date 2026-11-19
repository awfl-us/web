# Web `wip-old` reconciliation (2026-11-19)

Source `wip-old` 3923043; target `main` aa7b5d3. Optional, standalone UX workstream. **Keep it independent of typed-tool or agent-workflow migrations.**

## Candidate A: dynamic model picker

Current `src/features/sessions/hooks/useSessionModel.ts` still uses static `OPTIONS`; `wip-old` adds `/workflows/llm/models` discovery, tooltip metadata, authenticated fetch, and per-session persistence.

- **Port the feature as a new implementation**, not its 142-line diff: use typed API response, loading/error states and cleanup. Preserve a saved valid session selection across refresh and catalog fetch; don't silently reset unknown-but-current selections to `gpt-5` before the fetch finishes.
- Server `main` currently returns `pricing: { openai: PRICING }`; historical web's `pricing[model]` lookup is incorrect. Normalize the API at the boundary. Price display must use the **right units**; old `formatPricing` labels numerical values `/1k` although server pricing is per million tokens.
- Do not present a model as selectable if the server cannot run it with user's credentials. Keep stale/historical models in usage history but not necessarily in the picker. Avoid hardcoded 2026 model allowlists from old server branch.
- Filter/label by provider and model ID; show context vs completion limits correctly. Display an informative unavailable-state rather than silently substituting a different model.

## Candidate B: reactive project selection and stats

Current project selection is cookie/sessionStorage-based and Stats doesn't automatically reload on changes. `wip-old` adds `useSyncExternalStore`, `subscribeSelectedProjectId`, and `Stats.reload()` on selection change.

- **Port selectively:** make selected project a single observable store with an explicit snapshot/subscription contract. Avoid duplicate source-of-truth or re-render loops. Test same-tab changes, cross-tab behavior, no-selection, cookie fallback and cleanup.
- Verify stats fetch uses the **selected project as request scope**, not only calls `reload()` with a stale captured project ID. On project change, cancel old request and clear stale data before rendering new project's usage.

## Validation

- Hook unit tests with mocked catalog (empty, nested provider pricing, unknown model, malformed entries, 401, delayed token, request cancellation, catalog update). Check save/restore and correct price conversion.
- React tests: select A→B→A, open Stats in different tab, request race A/B, leave page/remount, and session-specific model selections. No data or credentials leakage between projects.
- Browser smoke test in Chromium on `Sessions` and `Stats` at responsive widths; monitor network calls, dropdown accessibility, tooltips and persistence.
- Coordinate only a minimal catalog API contract with server; no GKE/model-pricing backport and no dependency on old compiler.

**Exit:** reliable dynamic picker and/or correctly scoped stats refresh, or explicitly defer if cost exceeds UX value. Neither blocks the core reconciliation.
