Consuming @awfl/web

Package
- Name: @awfl/web
- Engine: Node >= 20.19
- Format: ESM only
- Types: included (.d.ts)
- CSS: CSS Modules are compiled and injected at runtime; components may import *.module.css.

Import surfaces (recommended)
- Prefer importing via feature public barrels exposed by this package, following Sessions page architecture:
  - features/*/public
  - core/public
  - types/public and lib/public
- Rationale: stable API, encapsulated internals, easier future slimming.

Deep import compatibility (restored)
- For backward compatibility with existing consumers, all source files under src are built and emitted to dist mirroring the folder structure.
- Examples that now resolve again:
  - @awfl/web/auth/AuthProvider
  - @awfl/web/api/apiClient
  - @awfl/web/features/tools/useToolExec
  - @awfl/web/features/filesystem/parse
  - @awfl/web/features/filesystem/hooks/useFsList
  - @awfl/web/hooks/useSessionTasks
- Mapping:
  - package.json exports maps "./*" -> "./dist/*.js"
  - typesVersions maps "*" -> "dist/*"

Notes for consumers
- If you previously deep-imported internal paths, they will continue to work with the current release stream.
- New code should migrate to the public surfaces over time to reduce coupling to internals.

Publishing & provenance
- The package includes repository/homepage/bugs metadata. npm provenance validation requires repository.url to match the GitHub repo.
- Tagging vX.Y.Z on the repo will publish the matching version to npm (with provenance) once CI is green.

Troubleshooting
- If Vite reports unresolved @awfl/web/* modules:
  1) Ensure you are on the latest published version.
  2) Remove your lockfile and node_modules, then reinstall.
  3) Verify dist contains the expected file path under node_modules/@awfl/web/dist/...
  4) Confirm your tooling is configured for ESM.

Migration guidance (longer-term)
- Replace deep imports with public barrel imports exposed by this package’s features to enable future slimming without breaking changes.