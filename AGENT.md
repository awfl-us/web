# Sessions page architecture and extension guidelines (AGENT)

This document captures the intent behind the Sessions page architecture and provides guidance for future development. It emphasizes small, safe, incremental changes that keep the UI responsive and the codebase cohesive.

Scope
- Page orchestrator: src/pages/Sessions.tsx
- Feature modules (encapsulated):
  - src/features/sessions (public.ts surface)
  - src/features/yoj (public.ts surface)
  - src/features/tasks (public.ts surface)
  - src/features/agents (public.ts surface)
  - src/features/tools (public.ts surface)
- Cross-cutting: src/core/public (shared hooks/services)
- Shared types and pure utils: src/types/public, src/lib/public
- API client: src/api/ (only consumed via feature hooks/services)

Vision and principles
- Thin page orchestrator: Sessions.tsx should coordinate state and compose components, not implement data fetching or heavy UI logic.
- Encapsulated features: Each feature exposes a minimal, stable public surface (public.ts). Internals stay private to the feature.
- Cohesive modules: Keep each concern (fetching, mapping, UI, API) in small files (<275 lines), with explicit inputs/outputs.
- Centralized API rules: Authentication headers, dev-bypass, and endpoint base paths live in a tiny api client; only feature hooks talk to it.
- Conservative changes: Prefer minimal diffs, preserve behavior, and land changes via small PRs.
- Abort and resilience: Hooks cancel in-flight requests on dependency changes and swallow per-item mapping errors.
- Stable shapes: Normalize backend document shapes to shared types close to the boundary.
- App shell alignment: Respect the scrolling strategy (outer container hidden, inner panels manage overflow).

Current implementation (as of this document)
- Page orchestrator: src/pages/Sessions.tsx
  - State: selectedId and client-side query string.
  - Data: session list via useSessionsList; Yoj messages via useTopicContextYoj; task counts and inline tasks via tasks feature; agent linking via agents feature.
  - UX: auto-selects first session on load; filters across title/summary/tags/highlights; renders header + messages with status; task list toggle; agent modal.
- Hooks (consumed via feature/core public barrels)
  - Sessions: useSessionsList (features/sessions/public)
  - Yoj: useTopicContextYoj (features/yoj/public)
  - Tasks: useTasksCounts, useSessionTasks (features/tasks/public)
  - Agents: useAgentsApi (features/agents/public)
  - Core: useWorkflowExec, useDebouncedValue, useScrollHome, useSessionPolling (core/public)
- API client: makeApiClient (src/api/apiClient.ts)
  - Methods: listSessions, topicContextYoj, workflowsExecute, workflowsStatusLatest, workflowsStop.
  - Centralizes Authorization and X-Skip-Auth; feature hooks call into this client.
- Types and mapping
  - Session (features/sessions/public)
  - ToolItem (features/tools/public)
  - YojMessage (features/yoj/public)
  - mapTopicInfoToSession (features/sessions/public)
- Presentation components
  - SessionSidebar, SessionDetail (features/sessions/public)
  - TaskModal (features/tasks/public)
  - AgentModal (features/agents/public)

Auth and environment
- Auth header: Authorization: Bearer <idToken>
- Local dev bypass: X-Skip-Auth: 1 when VITE_SKIP_AUTH=1
- Vite proxy: /api → backend during development

Public import surfaces (LLM-friendly)
- Pages should import only from feature public barrels and core/public:
  - Components:
    - `import { SessionSidebar, SessionDetail } from '../features/sessions/public'`
    - `import { TaskModal } from '../features/tasks/public'`
    - `import { AgentModal } from '../features/agents/public'`
  - Hooks:
    - `import { useSessionsList, filterSessionsByQuery, mapTopicInfoToSession } from '../features/sessions/public'`
    - `import { useTopicContextYoj } from '../features/yoj/public'`
    - `import { useTasksCounts, useSessionTasks } from '../features/tasks/public'`
    - `import { useAgentsApi } from '../features/agents/public'`
    - `import { useWorkflowExec, useDebouncedValue, useScrollHome, useSessionPolling } from '../core/public'`
  - Types:
    - `import type { Session } from '../features/sessions/public'`
    - `import type { ToolItem } from '../features/tools/public'`
    - `import type { YojMessage } from '../features/yoj/public'`
  - Lib:
    - Prefer helper exports from the owning feature’s public.ts; shared generics come from `../lib/public`.
- Rationale: keeps import sites stable, prevents cross-feature deep imports, and allows safe extractions into awfl-kit later.

Feature-module encapsulation (enables safe extensions)
- Goal: allow safe extensions by isolating internals and exposing stable, minimal public surfaces per feature.
- Pattern:
  - Each feature folder provides public.ts, re-exporting only supported API:
    - Stateless presentation components (render-only)
    - Hooks/services (data orchestration, side effects; accept `enabled` and abort correctly)
    - Utilities/mappers (pure helpers; defensive normalization at boundaries)
    - Types relevant to consumers
  - Internals remain private to the feature; no cross-feature deep imports.
  - Cross-feature usage goes only through the callee feature’s public.ts.

Layering model and allowed imports
- pages/
  - May import: features/*/public, core/public, types/public, lib/public
  - Must not import: features/* deep internals, api/* internals
- features/<domain>/
  - Public: features/<domain>/public.ts — the only import path others should use
  - Internals: features/<domain>/* — used only within the same feature
  - May import: core/public, types/public, lib/public, api client (through the feature’s local hooks/services only)
  - Must not import: other features’ internals (use their public.ts), pages/*
- core/public
  - Cross-cutting hooks/services (e.g., useWorkflowExec, useDebouncedValue, useScrollHome, useSessionPolling)
- api/
  - Centralized client (makeApiClient). Hooks encapsulate api calls; pages do not import api directly.
- lib/public and types/public
  - Pure utilities and shared types; no side-effects.

Encapsulation checklist for new work
- When adding a new capability in a feature:
  1) Implement the hook/service/component inside that feature’s folder.
  2) Export only the intended surface from features/<domain>/public.ts.
  3) Keep types stable and defensive; normalize backend shapes in mappers.
  4) Hooks must accept an enabled flag and use AbortController; guard setState on unmount.
  5) Do not import another feature’s internals; extend that feature’s public.ts if needed.
  6) Preserve the page orchestrator’s role; pages compose public hooks/components and pass ids/tokens only.

Enforcement (warn-only, planned)
- ESLint layering rules (warn-only):
  - Warn if pages import anything except features/*/public, core/public, types/lib public.
  - Warn if features import other features’ internals or pages.
  - Warn if components import pages.
- dependency-cruiser (warn-only):
  - Warn on forbidden edges across layers and cross-feature internals.
- Rationale: non-blocking guidance to encourage correct encapsulation while allowing incremental adoption.

Extending features safely (updated)
- Add new hooks/components in a feature; expose via public.ts only.
- Cross-feature usage goes through the callee feature’s public.ts — never deep import.
- Keep API details inside hooks; pages keep orchestration only.
- Favor small, additive changes (minimal diffs) and maintain existing behavior.

Testing checklist (for any change)
- Unauthenticated: sessions clear, selection resets, no crashes.
- Authenticated: sessions load in the expected order; first item auto-selected; Yoj messages load for the selected session.
- Errors: API and mapping errors surface in the UI (error banner) and do not crash the page.
- Abort: switching selection quickly does not flash stale content; no memory leaks in console.
- Shell: scrolling remains within panels; header stays visible.

Patterns to follow
- Hooks
  - Accept an enabled flag; return { data, loading, error, reload }.
  - Use AbortController and guard setState when unmounted.
  - Keep parameters explicit and stable; use a bump ref for reload triggers.
- Mapping
  - Normalize at the boundary (mapper functions). Do not spread ad hoc mapping across the UI.
  - Tolerate nulls/missing fields and log/skip bad docs.
- UI
  - Keep presentational components stateless and focused on rendering.
  - Use small inline styles or existing design tokens; avoid global changes.
- API client
  - Add a new method for each workflow/route; do not inline fetch in components or hooks.
  - Centralize headers and body auth semantics.

Alternate Kala kinds (Prakriya/Yoj/Iṣṭa/Kālavibhāga)
- Use SegKala for time-window context (current default).
- Add a toggle to switch to SessionKala for whole-session context when appropriate.
- If semantics are unclear, consult Sutradhara to ensure correct time segmentation and mapping to Firebase data.

Coding conventions
- File size target: keep modules under ~275 lines.
- Naming: hooks use useXyz; mappers use mapXyzToAbc; types live under src/types.
- Imports: page → feature public + core/public; hooks → api + types + utils; components → types only when needed.
- Minimal diffs: refactors should maintain behavior and keep PRs small.

When to split further
- If a hook grows past ~200 lines, consider extracting helpers (e.g., shape normalization) into src/utils/.
- If Sessions.tsx grows past ~180 lines again, consider extracting a SessionDetail layout wrapper to bundle header + list.

Common pitfalls to avoid
- Duplicating fetch or header logic in multiple places; always go through apiClient.
- Coupling UI to raw backend shapes; keep mapping in one place.
- Forgetting to guard setState after unmount or when disabled.
- Changing the scroll model in the page container; keep overflow hidden on the outer container.

Glossary (contextual)
- Prakriya: process/flow domain where time segmentation matters for context computation.
- Yoj: emitted message/context segments used for rendering.
- Kālavibhāga: time segmentation; use SegKala (window-based) or SessionKala (whole session).
- Iṣṭa: target/preference–type settings that may guide future context requests (out of scope for the current page but relevant when adding presets).

Checkpoints before merging
- Run `npm run typecheck` and `npm run lint`.
- Validate both authenticated and VITE_SKIP_AUTH=1 dev flows.
- Verify no regressions in selection, filtering, and message rendering.
