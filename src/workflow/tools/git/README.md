Git Files Service tools

Overview
- Thin wrappers around the backend Git Files Service mounted at /workflows/services/git (proxied via /api).
- Exposed under workflow tools namespace as `git` with functions: list, read, write, delete, tree, configGet, configPut, configDelete.

Endpoints
- GET /list?path=&ref=&projectId=
- GET /read?path=&ref=&projectId=
- PUT /write { path, content, message?, branch?, sha?, projectId }
- DELETE /delete { path, message?, branch?, sha?, projectId }
- GET /tree?ref=&recursive=1&projectId=
- GET /config?projectId=
- PUT /config { projectId, owner?, repo?, token?, defaultBranch? }
- DELETE /config?projectId=

Error semantics
- 400 → code: MISSING_TOKEN (missing GitHub token)
- 401 → code: BAD_CREDENTIALS (bad credentials)
- Others → code: HTTP_ERROR with httpStatus and details.message when present

Usage snippets

// list root files
const items = await git.list({ projectId, path: '' })

// read file
const file = await git.read({ projectId, path: 'README.md' })

// write file
await git.write({ projectId, path: 'notes.txt', content: 'hello', message: 'add notes' })

// delete file
await git.delete({ projectId, path: 'notes.txt', message: 'remove notes' })

// fetch tree
const t = await git.tree({ projectId, ref: 'main', recursive: true })

// configure repo (token optional; server can fallback to env)
await git.configPut({ projectId, owner: 'acme', repo: 'repo', defaultBranch: 'main', token })
const cfg = await git.configGet({ projectId })

Notes
- Provide projectId to scope operations; the server may use it to resolve credentials and repository mapping.
- Token resolution is handled server-side; clients may omit token.
- Tools are tree-shakeable and avoid heavy deps; they reuse the shared api client.
