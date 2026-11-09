# Super Agent Insights

Super Agent Insights is a workspace for AI conversations, connected context, searchable knowledge, and reviewed memory. The React frontend uses a separate FastAPI backend. This checkout uses sample data and prepared answers; it is not a deployed production service.

## Features

- **Super Agent:** the default chat page. A centered welcome leads into a single composer and a scrolling conversation. Context settings, knowledge pins, memory, and CAFE(S) checks stay available as compact controls.
- **Context Layer:** manage configured data sources, registered files, and MCP tools; try a question and inspect its local evaluation.
- **Knowledge Layer:** search records, inspect source references, pin relevant evidence, or explore relationships.
- **Memory:** review, correct, approve, or retire reusable records. Memories, Graph, and Sources are the main views.
- **Context quality:** a separate, concise CAFE(S) assessment with expandable check details and included/excluded records.

The original teal sidebar and Super Agent Insights suite branding are retained. Navigation is open-ended. There is no prescribed business story, journey rail, scenario switcher, evaluation dashboard, or action-planning workflow. Existing saved tasks are preserved; new chats contain no domain assumptions. Help and environment details are available from **Help & workspace info**.

Context checks execute through `POST /api/context/review`. New agent runs require structured task context and repeat the checks server-side before starting. The UI always sends the normal `ready` scenario; fault-injection scenarios remain available only through the local API for testing. The checks enforce local sample rules, not factual accuracy or enterprise authorization.

The private LangSmith/Deep Agents/Hindsight backend is not connected. Task drafts are browser-local. See the [backend handoff](docs/BACKEND_INTEGRATION.md#context-review-ui-and-private-backend-handoff), [implementation plan](docs/CONTEXT_QUALITY_IMPLEMENTATION_PLAN.md), and [workspace guide](docs/PRODUCT_DEMO_GUIDE.md).

## Repository layout

```text
frontend/
  src/components/   Reusable UI components
  src/lib/          View models, memory helpers, and API contract
  src/services/     Replaceable HTTP adapter
  tests/            Frontend self-checks
  package-lock.json Reproducible frontend dependency installation
backend/
  app/              FastAPI endpoints, services, validation, and SQLite storage
  data/             Mock datasets and response fixtures
  tests/            API and persistence tests
  requirements.txt  Pinned runtime dependencies
  requirements-dev.txt
                    Runtime and test dependencies
docs/
  PRODUCT_DEMO_GUIDE.md
                    Workspace usage and sample-backend limitations
  BACKEND_INTEGRATION.md
                    Screen-by-screen backend wiring guide
```

## Requirements

- Python 3.11 or newer
- Node.js 22.13 or newer, with npm
- Git

## Run locally

Run these PowerShell commands from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
npm --prefix frontend ci
```

Start the backend in one terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
npm --prefix frontend run dev
```

Keep both terminals running. Open the [studio](http://127.0.0.1:5173/), [API documentation](http://127.0.0.1:8000/docs), or [health endpoint](http://127.0.0.1:8000/api/health). On macOS/Linux, use `.venv/bin/python` instead of `.\.venv\Scripts\python.exe`.

## Configuration and saved data

No credentials or environment files are required for the default local setup.

| Setting | Default / use |
| --- | --- |
| `VITE_API_BASE_URL` | Leave blank to use Vite's `/api` proxy to port 8000. Set in `frontend/.env.local` for another API base URL, including `/api`. Restart Vite after changing it. |
| `STUDIO_DB` | Defaults to `backend/.data/studio.sqlite3`. Set in the backend process environment to use another database path. |
| `STUDIO_CORS_ORIGINS` | Comma-separated browser origins allowed by the API. Local frontend origins are enabled by default. |

Configuration examples are in `frontend/.env.example` and `backend/.env.example`. The backend reads process environment variables; it does not automatically load `.env` files. Never put service secrets in `VITE_*` variables, which are public browser configuration.

SQLite preserves memories, approvals, source selections, MCP configuration, and bank settings between restarts. The database is created on first startup and stays local. Local databases, credentials, dependencies, build output, caches, and generated artifacts are excluded by `.gitignore`.

## Checks

```powershell
.\.venv\Scripts\python.exe -m pytest -c backend/pytest.ini backend/tests -q
npm --prefix frontend test
npm --prefix frontend run build
```

Backend tests cover validation, evidence eligibility, persistence, idempotent run completion, and the local API contract. Frontend checks cover graph interactions, memory review ordering, and API adapters. The build runs TypeScript checks and creates `frontend/dist/`.

## Reuse the design or connect real services

- [Frontend reuse guide](frontend/README.md): component exports, callbacks, and theme setup.
- [Backend integration guide](docs/BACKEND_INTEGRATION.md): API contracts, adapter injection, and each screen's integration points.

`frontend/src/lib/contracts.ts` defines the `StudioApi` boundary. Keep provider-specific authentication and response mapping in the backend or `frontend/src/services/http-studio-api.ts`. API-independent components are exported from `frontend/src/ui.ts`.

## Current backend scope

The current backend is a single-user local mock. It does not execute MCP tools, ingest file contents, query Azure AI Search, invoke live LLM agents, or deliver outbound webhooks. Uploads register file names only. Recall, reflection, and graph relationships use deterministic local logic. Production authentication, tenant isolation, and live enterprise integrations need to be implemented before production use.

## Upload to Git

Source, fixtures, dependency manifests, lock files, tests, and documentation belong in the repository. Keep generated files and local data ignored.

Review and commit from the repository root:

```powershell
git status --short
git diff --cached --stat
git add .
git commit -m "Add Super Agent Insights studio and FastAPI backend"
```

Create an empty remote repository on your Git host. Replace the placeholder below with its URL, then push your current branch:

```powershell
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin HEAD
```

If an `origin` remote already exists, inspect it with `git remote -v` before changing it. These commands upload source code only; they do not deploy the application.
