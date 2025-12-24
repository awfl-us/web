# AWFL Web (React + TypeScript + Vite)

AWFL Web is a React front‑end for exploring workflow "sessions", inspecting emitted context (Yoj), managing tasks, linking agents and tools, and interacting with project files. The app favors a clear layering model: thin pages orchestrate data and render encapsulated feature modules; all API calls route through a tiny client.

This README gives a quick overview, how to set up and run locally, and development guidelines that align with the Sessions page architecture described in AGENT.md.


## Using @awfl/web as a library (components + CSS)
We publish the source as an ES module package with extracted CSS.

Install
- npm i @awfl/web

Import once at app entry to load styles
- import '@awfl/web/styles.css'

Import components and hooks from feature public surfaces or deep paths
- import { SessionSidebar, SessionDetail } from '@awfl/web/features/sessions/public'
- import { useSessionsList } from '@awfl/web/features/sessions/public'

Notes
- CSS is extracted to dist/styles.css and referenced via the package subpath '@awfl/web/styles.css'.
- Deep imports are supported via exports mapping; types resolve to dist via typesVersions.
- Peer dependencies: react and react-dom >= 18.


## Features at a glance
- Sessions: list, search/filter, select; auto-selects first on load
- Yoj messages: windowed topic context for the selected session
- Tasks: inline list by status, modal CRUD, and counts
- Agents: link an agent to a session; manage tools on an agent
- File system and viewer: browse/edit files (feature modules)
- Workflow exec controls: start/stop, poll status


## Tech stack
- React 19 + TypeScript 5 + Vite 7
- Firebase Authentication (Google) for ID tokens
- Centralized API client (fetch) with Vite dev proxy to a backend
- ESLint + TypeScript project references + Vitest


## Getting started

Prerequisites
- Node.js >= 20.19.0
- npm (or pnpm/yarn if you prefer) 
- A Firebase project (for client-side auth)
- A backend reachable at http://localhost:5050 that serves the /api routes (see Backend expectations)

Setup
1) Copy environment example and fill in Firebase config
   - cp .env.example .env.local
   - Fill VITE_FIREBASE_* values from your Firebase console
   - Optional: set VITE_SKIP_AUTH=1 to bypass auth during local dev if your backend allows it
   - Optional: VITE_WORKFLOW_ENV can suffix workflow names (e.g., Dev) for local isolation
2) Install dependencies
   - npm install
3) Run the development server
   - npm run dev
   - Open http://localhost:5173
4) Build and preview
   - npm run build
   - npm run preview
5) Tests, lint, and typecheck
   - npm run test or npm run test:watch
   - npm run lint
   - npm run typecheck


## Backend expectations (dev proxy)
Vite dev server proxies these paths to http://localhost:5050:
- /api, /jobs, /context

Authentication and headers sent by the api client:
- Authorization: Bearer <idToken> (when signed in)
- X-Skip-Auth: 1 (when VITE_SKIP_AUTH=1)
- x-project-id: <cookie awfl.projectId> (if set; used to scope project-specific requests)

You can set the project cookie for scoping:
- document.cookie = 'awfl.projectId=<your-project-id>; path=/'


## Configuring the API base URL (runtime, bundler-agnostic)
By default, the client calls relative paths like /api/... to work seamlessly with the dev proxy.
You can configure an absolute base URL at runtime without coupling to a specific bundler.

Preferred patterns
- Runtime config API (works in any stack)
  - Import once in your app entry and set it from your env of choice:
    - Vite: setDefaultApiBase(import.meta.env.VITE_API_BASE || '')
    - Next.js: setDefaultApiBase(process.env.NEXT_PUBLIC_API_BASE || '')
  - Import path: `import { setDefaultApiBase } from '@awfl/web/core/public'`
  - Behavior: empty values are ignored, so the library keeps '/api' in dev by default.

- React provider (ergonomic for component trees)
  - Wrap your app:
    - <ApiProvider baseUrl="https://api.cornerstoneai.org">{children}</ApiProvider>
  - Hooks/components can read/update at runtime via `useApiConfig()`.
  - Import paths: `import { ApiProvider, useApiConfig } from '@awfl/web/core/public'`

- Optional static HTML override (for plain HTML sites)
  - Set a global in your index.html before your bundle:
    - <script>window.__AWFL_API_BASE__ = 'https://api.example.com'</script>
  - The library will pick it up automatically on load.

Notes
- Default remains '/api' to preserve Vite's dev proxy behavior.
- The runtime setter/provider take precedence over any HTML global.
- The library no longer reads import.meta.env/process.env directly for the API base, avoiding bundler-specific transforms in node_modules.


## API base URL (legacy env guidance)
If you previously relied on VITE_API_BASE at build time, migrate to one of the runtime options above. For reference only:
- Development: leave VITE_API_BASE empty so calls use /api and are proxied.
- Production: use a runtime setter (recommended) or ensure your app sets the base in a provider.


## CI/CD and deployment
We use GitHub Actions + Google Cloud Workload Identity Federation (WIF) to build and push a container image to Artifact Registry on merges to main. The deploy workflow does not run Terraform; infra is applied manually.

Key files
- .github/workflows/deploy.yml — builds and pushes the image. First step loads env from .github/actions-variables.json if present; otherwise it uses repository Variables.
- infra/ — Terraform that provisions the WIF provider/pool, minimal IAM, Cloud Run, and outputs the Actions variables file.

Terraform-first setup (one-time)
1) Set repo in Terraform variables
   - Either create infra/dev.auto.tfvars with:
     github_repository = "OWNER/REPO"
   - Or pass -var='github_repository=OWNER/REPO' at apply time.
2) Apply infra locally (from infra/)
   - terraform init
   - terraform apply \
       -var='project_id=YOUR_GCP_PROJECT' \
       -var='region=us-central1' \
       -var='github_repository=OWNER/REPO'
   - Optional: reuse an existing deploy SA by adding \
       -var='create_deploy_sa=false' \
       -var='deploy_sa_email=deploy@YOUR_GCP_PROJECT.iam.gserviceaccount.com'
3) Commit the generated variables file
   - Terraform writes .github/actions-variables.json at the repo root.
   - Commit it so the deploy workflow can load these values, or
   - Run the “Sync Actions repo variables” workflow to copy values into repository Variables and then (optionally) delete the file.

What’s in .github/actions-variables.json
- GCP_PROJECT_ID
- GCP_REGION
- GCP_WIF_PROVIDER (full resource name)
- GCP_DEPLOY_SA (email)
- ARTIFACT_REPO
- IMAGE_NAME

How the deploy workflow uses it
- On each run, the first step loads any keys from .github/actions-variables.json into the job environment.
- If the file is absent, it falls back to repository Variables with the same names.
- The workflow authenticates via WIF and builds/pushes:
  REGION-docker.pkg.dev/PROJECT/ARTIFACT_REPO/IMAGE_NAME:{sha,latest}


## Project structure (high level)
- src/pages: thin page orchestrators (compose features and state)
- src/features/<domain>:
  - public.ts: the only import surface for other modules
  - components, hooks, utils, types: internal to the feature
- src/core/public.ts: cross-cutting hooks/services re-exported for pages
- src/api/apiClient.ts: tiny, centralized client; only feature hooks call it
- src/types and src/lib: shared types and pure utilities
- src/auth: Firebase auth provider and hook

Example imports from a page:
- Components: import { SessionSidebar, SessionDetail } from '../features/sessions/public'
- Hooks: import { useSessionsList } from '../features/sessions/public'
- Cross-cutting: import { useWorkflowExec } from '../core/public'
- Types: import type { Session } from '../features/sessions/public'


## Architectural conventions (aligned with AGENT.md)
- Thin pages: do orchestration only; no API calls or heavy logic in pages
- Encapsulated features: expose a minimal, stable public.ts; keep internals private
- Centralized API rules: all calls go through src/api/apiClient.ts
- Stable shapes at boundaries: normalize backend docs with mapper utils
- Hooks: accept an enabled flag, use AbortController, and guard setState after unmount; return { data, loading, error, reload }
- Small files: prefer modules under ~275 lines; extract helpers when growing
- Imports: pages → features/*/public + core/public; features never deep-import other features

For full guidance and rationale, see AGENT.md.


## Sessions page reference (what you’ll see locally)
- src/pages/Sessions.tsx orchestrates:
  - Session list via features/sessions (useSessionsList, filterSessionsByQuery)
  - Yoj messages via features/yoj (useTopicContextYoj)
  - Tasks via features/tasks (useTasksCounts, useSessionTasks)
  - Agents via features/agents (useAgentsApi, AgentModal)
  - Workflow exec via core/public (useWorkflowExec) and polling (useSessionPolling)
  - Scroll behavior via useScrollHome; auto-selects first session; debounce query input
- Dev behavior: when no auth, selection clears; when sessions change, selection updates; polling ~1500ms


## Environment variables
Defined in .env.local (Vite exposes only VITE_*):
- VITE_API_BASE (empty in dev; https://api.awfl.us in prod)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_SKIP_AUTH (0 or 1; optional, local dev bypass if backend permits)
- VITE_WORKFLOW_ENV (optional; suffix for workflow names like "Dev")


## Development workflow
- Start from a feature: add hooks/components under that feature folder
- Export only the intended surface from features/<domain>/public.ts
- Map and normalize data at the boundary (in the feature), not in pages
- Keep PRs small and additive; preserve current behavior
- Before pushing:
  - npm run typecheck
  - npm run lint
  - Validate both authenticated and VITE_SKIP_AUTH=1 flows
  - Sanity-check selection, filtering, scrolling, and error states on Sessions page


## Troubleshooting
- 401/403 from backend: verify Firebase config and that your backend trusts the token or enable VITE_SKIP_AUTH=1 for local testing
- Unexpected HTML response: ensure the API proxy targets the backend and that the backend is running on port 5050
- No sessions appear: confirm you’re signed in and the backend has session data; check network tab for /api/workflows/context/sessions/list


## License
MIT © 2025 awfl-us
