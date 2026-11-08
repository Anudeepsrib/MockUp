# Super Agent Insights

An AT&T themed enterprise intelligence studio with a React UI and a separate FastAPI backend. Run both services locally. The backend uses deterministic mock data so the interface can be explored without enterprise credentials.

## Features

- **Context Layer:** configure enterprise sources and MCP endpoints, register file names, try questions, and view evaluations.
- **Knowledge Layer:** explore dataset relationships on an interactive white canvas.
- **Super Agent:** ask questions, follow agent progress, inspect sources, and review newly saved memories.
- **Compounding Intelligence:** see what the agent learned, what is ready to reuse, and what needs review. Explore the memory graph, edit facts, approve records, and open related questions.

Graphs support canvas panning, draggable nodes, zoom, and clickable record details. Memory review preserves source evidence and keeps unapproved or invalidated knowledge out of recall.

## Product walkthrough and demo narrative

Read the [end-to-end product demo guide](docs/PRODUCT_DEMO_GUIDE.md) for a 10–15 minute pitch following Jordan's Northeast churn investigation: connect context, explore relationships, explain the service and revenue risk, review new memories, and reuse approved knowledge in the next conversation. It includes presenter talking points, exact mock-data figures, user instructions, the React/FastAPI/SQLite flow, and the boundaries between working prototype behavior and future integrations.

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
                    Product narrative, user walkthrough, and presenter guide
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
