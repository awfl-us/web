# Session chat UX redesign

Status: in progress (2026-11-27). Baseline: `0433845`; plan: `4e59cf8`. Phase 1 checkpoint `710f6e0` deployed with `226ac17`; Phase 2 checkpoint `fcc4341` deployed; Phase 3 compact activity checkpoint implemented.

## Goal and evidence

Make AWFL a conversational agent workspace with technical depth on demand. Retain agent/workflow controls, task and file management, costs, execution inspection and streaming. Style and layout must be independently customizable without modifying data hooks, execution logic or backend contracts. The proposed layout and palette are defaults, not permanent design decisions.

Review: public production site and latest source inspected; actual session components rendered in Chromium at 1440px and 390px using synthetic messages. At 390px the running-workflow composer input shrank to ~22px. Other issues: full-width role bubbles, preformatted assistant text, exposed tool JSON, task counts replacing chat, terse S/F navigation, execution gutter hidden on mobile. Authenticated production chat was not directly inspected.

## Architecture and customization contract

Follow `AGENT.md`: thin page, feature-owned hooks/mappers, public barrels and reusable package consumers. Prefer existing CSS Modules, CSS variables and React composition; audit before introducing a framework or dependency. Proposed ownership (confirm Phase 0):

| Surface | Location | Responsibility |
| --- | --- | --- |
| Theme | `src/features/ui/theme/` | Tokens, presets, light/dark, density |
| Shared UI | `src/features/ui/components/` | Accessible primitives and interactions |
| Layout | `src/features/sessions/layout/` | Typed defaults, named slots, responsive arrangement |
| Presentation | Existing owning features | CSS Modules, variants, render-only props |
| Appearance | UI/settings public surface | Validated preferences, preview, persistence, reset |
| Playground | `scripts/` or dev-only route | Fixtures, live theme/layout edits and viewport previews |

### Style

- Use three token layers: primitive palette/scale, semantic roles (surface, text, border, focus, success, warning, danger) and optional component aliases (bubble, composer, activity, toolbar). Document scoped `--awfl-*` custom properties and fallbacks; no global leakage into embedding apps.
- Presets are CSS/data, not alternative component implementations. Support system/light/dark and comfortable/compact; expose color, typography, font size/line height, spacing, radii, border, shadows, icon treatment and motion. Neutral initial palette is provisional. Honor contrast, focus and reduced motion.
- Preserve `@awfl/web/styles.css`, public APIs and current `--yoj-*` customization hooks, with documented precedence and package tests. Expose className, variants, stable slots/data attributes and CSS variables where useful. No hard-coded presentation constants in new TSX; dynamic geometry may use validated layout state. No broad `!important` overrides.
- Runtime overrides accept known bounded token values, not arbitrary CSS/HTML/JS; invalid inputs fall back. Developer overrides can use scoped CSS. Do not add external font dependency without reason.

### Layout

- Separate controller hooks (state/callbacks) from visual shell and named slots: project navigation, sessions, header, timeline, composer, inspector, status. Compose slots in React; do not build a generic JSON UI engine. Preserve a single timeline scroller and stable mounted stream/composer across layout changes.
- Use Grid/Flex, centralized responsive breakpoints or container queries; CSS media queries cannot consume custom properties. Default desktop: 240–280px session navigation, 300–340px optional inspector, 800–900px max content width. Mobile: single column, drawer/sheet/tab. Expose widths, side placement, order of supported regions, collapse/visibility, density, message alignment and detail mode; clamp to viewport and accessible minimums. Desktop resizing includes keyboard alternatives.
- Illustrative typed config (finalize after audit): `layout: { navigation: 'left', inspector: 'right', navigationWidth: 260, inspectorWidth: 320, conversationMaxWidth: 860, activity: 'compact', density: 'comfortable' }`. No data/API changes needed to switch configurations.
- Appearance settings: immediate preview of theme, accent, font scale, density, message style/width, panel placement/width/visibility; reset and import/export validated preset. Local account-scoped versioned persistence for non-sensitive appearance only; tolerate corrupt/unavailable storage. No server sync unless requested. Developer playground supports token edits, presets, layouts, viewport examples and hot reload; no production auth bypass. No arbitrary drag-and-drop page builder required.
- Precedence: bundled defaults -> selected preset -> validated user overrides -> scoped embedding overrides where exposed; document responsive constraints/reset/system theme. Theme/layout changes must not trigger API calls, reset scroll/draft/session selection, restart streams or affect running agents.

## Delivery plan

Each phase starts by investigating existing architecture, data contracts, public consumers and tests; update this plan with findings, decisions, acceptance evidence, commit/PR links and remaining work before proceeding. Land small independently deployable changes via normal main CI/CD; isolate worktrees; retain existing behavior until replacement parity. Ship usable improvements incrementally.

### 0 — Architecture audit and baseline
- [x] Inventory `App.tsx`, `Sessions.tsx`, `SessionDetail`, `SessionHeader`, `SessionItemsView`, `PromptComposer`, `YojMessageList`, `ExecGutter`, sidebar, tasks/files, global CSS, style props and public package/Rollup/declaration exports.
- [x] Audit `useScrollHome`, `useLiveResponses`, `useTopicContextYoj`, submission/stop/queue, SSE/persisted history, task/environment/workflow statuses. Identify available signals and backend gaps; finalize token/layout ownership and compatibility.
- [ ] Record desktop/mobile screenshots and baseline behavior; deterministic fixtures for idle, streaming, running, concurrent, errors, nested groups, tasks/files. Verify authenticated production if possible; distinguish fixtures. Preserve current CI streaming fixture.

### 1 — Customization foundation and urgent composer fix
- [x] Investigate CSS variables, responsive behavior, modal focus and current style props; settle minimal schema/slots before implementation.
- [ ] Implement scoped tokens, CSS Modules, presets, preference plumbing and dev playground; migrate touched components only. Test visibly distinct preset and preserve package styles/exports.
- [ ] Full-width auto-growing textarea, secondary toolbar for attachment/model/budget/send. Shift+Enter, IME, accessible keyboard, safe areas and mobile keyboard. Separate Stop from Send/Queue; show accurate sending/accepted/error state; preserve failed/new drafts. Scope draft state to account/project/session with documented local retention and isolation; no server persistence. Keep upload; investigate drag/drop and pasted image support.
- [ ] Test 320/390/768/1440px with long model names and running/submitting state: no clipped input/overflow, controls reachable, drafts retained, stop/queue unchanged. Verify alternative theme/layout without execution changes.

### 2 — Rich conversation rendering
- [x] Audit live/persisted Yoj shapes, marker parsing and library consumers; distinguish user/assistant text from tool/system/context groups and preserve identities/order.
- [x] Safe streaming Markdown: headings, tables, lists, links, copyable highlighted code. No raw HTML or unsafe URLs. Tool output stays text; preserve nested markers/whitespace; handle partial fences and stable live-to-persisted replacement.
- [ ] Configurable narrow/right-aligned user bubbles, open assistant typography, legacy/compact modes, optional timestamps/cost, copy actions. Test hostile Markdown, huge outputs, code overflow, nested markers, streaming, scroll, copy and theme overrides.

### 3 — Compact activity and execution inspection
- [x] Audit execution IDs, tool/result correlation and marker groups; identify actual durations/statuses/file changes; never invent success or progress.
- [ ] Pure presentation mapper for human-readable labels, grouped activity, expandable arguments/results, errors and file changes where supported. Group by actual run/call correlation; preserve concurrent/nested lanes, raw messages, summaries and existing group expansion; unmatched events accessible.
- [ ] Compact vs detailed/raw views, mobile inspection, active operations and failures visible; full available output accessible on demand. Test interleaved runs, missing metadata, errors and nested summaries.

### 4 — Workspace shell and inspector
- [ ] Audit task CRUD/counts, filesystem, agent config, execution trees and cost scope; identify existing reusable components and gaps.
- [ ] Configurable collapsible/resizable navigation and optional Tasks/Files/Runs/Usage inspector, keeping desktop chat visible. Accessible mobile drawers/tabs, clear labels, agent settings menu. Keep tasks/files/editor/upload/config functional; cost estimates labeled by actual scope. Add Jump to latest/new activity and preserve single scroll container and reader position across views.
- [ ] Appearance UI with live preview, reset and validated preset export/import. Demonstrate radically different palette and left/right panel swap without modifying feature logic. Test keyboard resizing, touch, focus return, safe areas and embedded package.

### 5 — Real-time activity and queued work
- [ ] Audit state machine, environment, SSE, acknowledgments, concurrency, cancel semantics; document backend event gaps and separate server plan if required.
- [ ] Distinguish environment readiness, execution status and stream connectivity; contextual preparing/working/writing/waiting/completed/failed only from supported data; stale/unknown accurately labeled. Reconnect does not mean execution failed.
- [ ] Show accepted/queued messages and run association; cancel only where supported, preserve async ack, avoid duplicate sends. Accessible live announcements, not every token. Test reconnect, scope switches, delayed history, transient failure, concurrent runs/stop/queue.

### 6 — Session management
- [ ] Audit session list/status/search/routing/mutations; identify backend needs for pin/rename/archive/unread; preserve project isolation.
- [ ] Clear navigation instead of S/F, relative dates, active/recent groups and known statuses. Add pin, rename, archive, deep links, unread completion and filtering as supported; document persistence. Test long lists, keyboard, loading/errors, selection, project switch, deep links, mobile navigation.

### 7 — Polish and release
- [ ] Audit hard-coded styles, contrast, focus/screen reader, dark mode, reduced motion, performance/bundle size. Finish touched session token adoption; no unrelated site-wide rewrite.
- [ ] Publish customization guide with copy/paste CSS override, layout preset, user settings, slots, breakpoints and package integration. Update `src/features/README.md` and `AGENT.md` with implemented public surfaces.
- [ ] Full CI/browser suite and screenshots across themes/densities/placements; authenticated prod smoke if accessible, deployment check, record evidence and outstanding issues. Independent rollback paths; no hidden backend schema changes.

## Regression gates / definition of done

- Existing `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run build:lib`, `npm run build:types` and Chromium streaming fixture; add behavior tests to CI as appropriate. Document pre-existing failures rather than masking them.
- Streaming first text/growth, stable live/persisted reconciliation, no duplicates, reconnect/scope cancellation, reader position and Jump to latest. No extra API requests from appearance changes.
- Prompt acknowledgment/failed draft, budgets/models, uploads, queue/stop, tasks/files/agent config, cost scope, raw execution inspection, auth/project/session isolation.
- Widths 320/390/768/1024/1440px, touch and keyboard, long content/code, contrast/focus, reduced motion/system theme, panel resizing and persisted preferences. Primary touch controls target 44px, no clipped text entry/horizontal document scroll. Assert behavior in addition to screenshots.
- Customization acceptance: alter accent, fonts, radii, spacing, width, density, message style and panel placement using preset/config/CSS only. Preview immediately, reload/reset; same controller/hooks across two layouts, no global leakage to host, no secrets in presets, no stream remount or draft/scroll loss. Document developer and end-user procedures.
- Preserve package public APIs or explicit migration/deprecation; retain raw views until parity. Each phase updates plan, docs and test evidence.

## Decisions and open questions

- Starting layout is a configurable three-panel desktop and single-pane mobile; neutral visual style is provisional. Prefer typed config, scoped CSS and local appearance persistence rather than server-managed themes or unrestricted page builder. Revisit if cross-device sync requested.
- Backend support for queue cancellation, precise spend, diffs, status and session mutations must be verified before exposing controls. No backend changes in this planning commit.
- Authenticated production inspection remains pending. See phase checkpoints below for current implementation status.


## 2026-11-27 — Phase 0 / Phase 1 checkpoint

- Architecture findings: the app page is the session controller; `SessionDetail` composes existing header, timeline and composer. Existing Yoj groups, execution gutter, scroll hook and SSE merge remain independent. Current task mode disables message polling and SSE; moving tasks into an inspector must intentionally keep the timeline mounted (Phase 4). The submission path awaits `awx.execute({query, model, fund})`, and stop includes descendants. Backend state is not sufficient to infer all planned real-time statuses, operation outcomes or per-message cancellation; verify server contracts in the relevant phases.
- The first implementation uses existing CSS Modules, a scoped token stylesheet, a versioned typed appearance model (theme, density, navigation side/width, composer max width), and a pure `SessionWorkspaceLayout` with named React slots. It retains the existing 320px navigation default (plus its rail) during migration; the earlier 240–280px proposal remains tunable. No new production dependencies, data hooks or endpoints. Existing `--yoj-*` overrides are untouched until timeline migration. Full dark styling, the inspector, user-facing appearance controls and preset import/export are still pending.
- The composer is now a full-width growing textarea above a wrapping control bar; model/budget/upload/send/stop/status are available, existing submission/stop callback contracts preserved, and Enter vs Shift+Enter and IME handled. Scoped, revisioned drafts survive tab reload and session changes using sessionStorage (not server or durable localStorage); acknowledgement clears only the submitted revision. Draft retention is the browser tab lifetime; failed drafts remain. Existing upload modal retained. Drag/drop, paste, actual on-device keyboard testing, additional focus/screen-reader work and concurrent submission edge cases remain to be validated.
- Baseline: TypeScript and 24 unit tests passed. New tests: 26 unit tests passed; Chromium composer fixture measured input width 282/352/367/878px at 320/390/768/1440px, with long model names and running workflow controls. Verified multiline submission, budget/model value, errors, failure retention, switching sessions, preserving a new draft during acknowledgement, theme/layout changes, reload/reset and Stop. First run found a too-short model selector target at 320px; fixed and passed. Existing streaming fixture passed (first visible text 109ms in the local run, not a production latency metric). Lint reported no errors and 27 warnings (one new fixture fast-refresh warning, corrected by exporting the component). Library and declaration builds passed; extracted CSS includes the new tokens.
- Added `scripts/session-ux-browser.html` as a local fixture/playground and `scripts/test-session-ux-browser.mjs` to deploy CI alongside the existing streaming check. The initial presets affect only migrated controls, not all legacy panels. The current browser tests use synthetic messages and mocked callbacks, not authenticated production or an actual mobile keyboard. Broad concurrent/nested/task/file fixture coverage remains open. Phase 1 is partially complete; next finish validation and expand rich message rendering/theme migration in Phase 2. See the customization guide for current override points.


## 2026-11-27 — Phase 2 rich conversation checkpoint

- Verified Phase 1 is deployed: its own deploy run was superseded/cancelled, but the descendant `226ac17` deployment succeeded ([run 46011654292](https://github.com/awfl-us/web/actions/runs/46011654292)); public production serves `index-CUTjwIHS.css` from the previous verified build. Preserved subsequent OpenCode provider work by basing on that commit. Authenticated production session and actual device keyboard validation remain outstanding.
- Investigated Yoj rendering: `getMessageKey` uses responseId for assistant messages; live and persisted paths previously diverged and persisted responses could collapse at 320px. Normal assistant text now uses the same Markdown component for live and persisted content, preserving DOM identity and displaying long replies without automatic clipping. Technical messages keep literal text and existing group/lane behavior. Explicit/embedded marker handling remains for compatibility; surrounding prose for embedded markers is retained. The existing ambiguous marker-like JSON example format remains a limitation until a structured event contract is defined.
- Chose pinned `react-markdown`, `remark-gfm`, `rehype-highlight` for CommonMark/GFM and syntax highlighting with no HTML injection. No raw HTML execution; URL transform accepts http/https/mailto and safe relative URLs, unsupported links become text, remote images become alt text rather than fetching, unknown languages stay plain. Copy response copies Markdown source; copy code copies text. No backend changes.
- Conversation presentation defaults to narrow right-aligned user bubbles, open assistant text, technical cards, optional cost/timestamp metadata, readable shared content width and scoped theme tokens (including code palette). `messageStyle: 'legacy'` preserves preformatted/full-width rendering; direct public YojMessageList keeps legacy default unless opted in. Existing `--yoj-*` hooks take precedence. User-facing preferences editor remains planned; playground supports switching styles and metadata live.
- Typecheck and 26 unit tests passed. Browser suite at 320/390/768/1440px passed headings/tables/links, highlighted and unknown-language code, copy code/source, HTML/image suppression, unsafe link, literal tool output, group expand/collapse, legacy mode, metadata and previous composer/draft/layout checks. Existing SSE browser suite passed with heading delta, reader-position retention, stable Markdown DOM root across persistence, no duplicate, scope switch and disabled transport; first visible text 29ms locally (not production latency).
- Production build and library bundle passed; app JavaScript 365.53 kB gzip (prior checkpoint 258.27 kB; includes subsequent OpenCode changes). Markdown/highlighting adds significant weight; consider code splitting or a narrower language set in polish. Existing Rollup circular dependency and bundle-size warnings remain.
- Next: finish remaining Phase 2 stress/accessibility coverage (large code, nested/interleaved fixtures and mobile device) then Phase 3 tool-call/result correlation audit, compact operations with expandable raw details. Do not infer success/duration from missing metadata. Full theme migration and inspector remain later phases.


## 2026-11-27 — Phase 3 compact activity checkpoint

- Phase 2 deployment verified: [run 46027238058](https://github.com/awfl-us/web/actions/runs/46027238058) succeeded; production serves the matching `index-CFLncta2.js` and `index-BNS4p-KN.css`. Authenticated production UI inspection remains open.
- Audited the current Scala `workflow-utils` ChatMessage/ToolCall schema and `workflows` Convo/ToolDispatcher/ToolWorkflow sources. Calls are persisted on assistant messages, with provider call ID; result messages carry `tool_call_id` and encoded content, potentially from child executions. Dispatcher deliberately skips typed output functions without executable registrations, so no result does not imply running or failure. No uniform success, duration, diff, or live execution signal is present in this message contract. Do not infer these from raw text; retain the existing workflow error banners.
- Pure `indexActivity` correlates unique explicit IDs in the loaded window only, requiring the result to follow its request. Duplicate, null, missing or reversed IDs remain unmatched; no adjacency guessing and no requirement for equal execution IDs across parent/child workflows. Requests from one message are grouped; results stay in their actual timeline positions to preserve interleaved executions and lane mapping. Root/standalone marker cards retain existing behavior. No backend changes or new dependencies.
- Conversation style defaults to compact activity. Collapsed rows show readable tool names or call count and recorded-result count, not success. Individual arguments, literal output and the original message are expandable and copyable. Long raw output scrolls within its inspection panel. A detailed activity mode restores the previous inline tool presentation independently of the message style. Existing legacy mode remains supported. Tool result rows without correlation are still inspectable. CSS tokens control the surface, spacing, radius, typography and output height; expandable row controls emit the existing user-content-expand signal.
- Validation: TypeScript and 29 unit tests passed (3 new mapping tests covering interleaving, child exec IDs, missing/ambiguous IDs, multiple calls and marker preservation). Chromium fixture passed 320/390/768/1440px, multiple calls and interleaved result ordering, raw output expansion, unmatched results, detailed/compact switching and previous Markdown/composer/theme regression checks. One test selector was adjusted to scope response-copy to the intended message after adding another assistant response.
- Remaining Phase 3 work: verify richer structured result/error metadata with backend where appropriate; no generic success/failure or active-operation display invented. More nested/concurrent group stress testing and accessibility on physical mobile devices remain. Next major milestone is Phase 4 inspector and user-facing appearance settings. Keep the existing timeline mounted while inspecting tasks/files and separate visual preferences from data fetching.
