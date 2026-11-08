# Backend integration guide

The design can be used as a complete studio or as individual visual components. Keep service-specific routes, authentication, and response mapping in an adapter, and pass normalized view models to the UI.

## Boundaries

```mermaid
flowchart LR
  UI[React screens and components] --> Contract[StudioApi contract]
  Contract --> Adapter[HTTP or SDK adapter]
  Adapter --> API[Backend services]
  API --> Providers[Connectors, search, agents, memory]
```

| File | Responsibility |
| --- | --- |
| `frontend/src/lib/contracts.ts` | Typed requests/results consumed by the studio: bootstrap, runs, answers, workspace, and the `StudioApi` interface. |
| `frontend/src/services/http-studio-api.ts` | HTTP routes, JSON serialization, timeouts, errors, and write ordering. Replace route/response mapping here when an API differs. |
| `frontend/src/lib/api.ts` | Active adapter and the studio's bootstrap cache. `initializeApi(customAdapter)` selects a backend. |
| `frontend/src/main.tsx` | Startup/composition point. Data loads before the studio is imported. |
| `frontend/src/ui.ts` | Public entry for API-independent `IntelligenceOverview`, `MemoryGraph`, `McpForm`, and `Button` components. |
| `frontend/src/lib/graph.ts` | Local fallback graph layout/relationship inference. Server-provided graph data bypasses this fallback. |
| `backend/app/main.py` | Current local HTTP contract and provider composition. |
| `backend/app/service.py` | Current deterministic question routing, recall, and memory extraction. |
| `backend/app/store.py` | Current single-workspace SQLite persistence. |

## Connect a backend that follows the current contract

Set the public API base URL, including `/api`, in `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Leave it blank to use Vite's existing `/api` proxy. Restart Vite after changing environment values. For another local target, change the proxy target in `frontend/vite.config.ts`.

The current backend's request schemas are available at `/docs` and `/openapi.json`. A replacement backend must either return the same view models or translate its own responses in a `StudioApi` implementation.

## Connect an HTTP backend with authentication or different routes

`createHttpStudioApi(baseUrl, fetcher?)` accepts an authenticated fetch implementation. For example, a same-origin cookie-authenticated API can be selected in `main.tsx`:

```ts
import {initializeApi} from './lib/api';
import {createHttpStudioApi} from './services/http-studio-api';

const client=createHttpStudioApi('/api', (url, init) =>
  fetch(url, {...init, credentials:'same-origin'})
);
await initializeApi(client);
// Import/render App after this resolves, as main.tsx already does.
```

If an API uses an SDK, different paths, or different response structures, implement the interface in `contracts.ts` and pass that object to `initializeApi`. The component calls remain unchanged. An adapter may delegate compatible methods to `createHttpStudioApi` and override only the methods that differ.

`VITE_*` values are public browser configuration. Connector secrets, service credentials, webhook signing keys, and privileged agent access belong on the backend. The local FastAPI app currently has no authentication. Its CORS configuration must be adjusted if a future API uses another browser origin or cross-origin cookies.

## Wire each area of the UI

| UI area / action | Current binding | Backend integration work |
| --- | --- | --- |
| Source catalog and initial workspace | `bootstrap()` -> `GET /bootstrap` | Return permission-filtered sources, profile, persisted selections, and display metadata. |
| Connect/disconnect a source | `App.tsx` `connect`, context save effect -> `saveContext()` | Configure connector authorization/ingestion. Return confirmed source IDs and metadata; add pending/error state handling if jobs are asynchronous. |
| Add MCP server | `McpForm.onAdd` -> context state -> `saveContext()` | Discover tools/resources/prompts server-side and enforce allowed tool access. The form currently saves endpoint metadata only. |
| Upload files | `App.tsx` `addFiles` -> `saveContext()` | Add a byte-upload or signed-upload service plus progress/status callbacks. The current endpoint stores file names only. |
| Try a question | `query(question)` -> `POST /query` | Run permission-aware retrieval and return `{answer}`. |
| Evaluate the data | `evaluate()` -> `POST /evaluations` | Return evaluation totals and metric scores using the current report model. |
| Knowledge graph and source details | `Bootstrap.knowledgeRecords`, `schemaNodes`, `MemoryGraph` | Fetch actual table/document/vector-index relationships. Pass normalized `MemoryGraphData` to the graph's `graphData` prop; wire the fetch in `App.tsx`. |
| Agent question | `startRun(question)` -> `POST /runs` | Start the orchestrator and return a stable run ID with normalized initial status. |
| Agent progress and memory saving | `pollRun(id)` -> `GET /runs/{id}` | Map agent/tool/memory events to the `AgentRun` view model. Keep memory persistence on the server. |
| Memory details, correction, approval, invalidation | `CompoundingConsole` -> `saveMemories()` | The local API accepts a full snapshot. A production adapter can issue per-record/versioned commands and then return refreshed canonical workspace state. |
| Compounding Intelligence overview | `IntelligenceOverview` -> record-derived summary and navigation callbacks | Supply current memory records, timestamps, source references, approval/validity, and evidence IDs. Counts represent eligible records, not accuracy gains. `onAsk` prefills a related stored question in Super Agent without sending it. |
| Memory relationship graph | `MemoryGraph` records and `onInspect` | Pass authoritative graph nodes/edges through `graphData`; keep pan, zoom, node dragging, and selection in the component. |
| Recall and reflection | `IntelligenceTools` action handlers | These currently rank/quote local records. Replace action handlers with retrieval/reasoning service calls and adapt results to the existing evidence/answer view. |
| Mental models and knowledge pages | `IntelligenceTools` -> local generation -> `saveBank()` | Replace generation/refresh handlers with server jobs; refresh returned content, source IDs, and timestamps. |
| Consolidation | `CompoundingConsole.consolidate` -> local derivation -> saves | Replace derivation with a server consolidation command and reload affected records/models/pages. |
| Bank templates and directives | Local manifest validation/application -> `saveBank()` | Move template import/dry-run/export and directive enforcement to the backend while preserving validation feedback. |
| Webhook subscriptions and event preview | Definitions -> `saveBank()`; payload preview is local | Add server subscription and delivery services. Signing, retries, and actual HTTP delivery are not implemented by the preview. |

This table distinguishes an existing API call from a future service connection. The current local backend does not execute MCP tools, ingest file contents, query Azure AI Search, invoke LangChain/LangSmith, or deliver webhooks.

## View-model rules to preserve

- IDs must remain stable between polling, graph selection, and persistence.
- `saveContext`, `saveMemories`, `saveBank`, and `reset` return a complete canonical `StudioState`. A backend that returns `204` must be adapted by fetching refreshed state.
- The HTTP adapter serializes writes and waits for pending context edits before starting a run. SDK adapters should provide equivalent ordering or use server-side version/concurrency controls.
- Failed requests reject with an `Error` whose message is safe to show. Do not hide persistence failures behind a successful response.
- `AgentRun.tick` is the current UI's progress scale from 0 to 12. Normalize an orchestrator's progress into that range. `complete` means its answer and reviewable memories have been persisted. Return `memories` on completion.
- `AgentRun.answer` supplies title, summary, metrics, findings, recommendation, and source references. Citations use that run's response, so new backend topic labels do not depend on canned bootstrap answers.
- `confirmed` is human review approval. `state` is fact validity. They are distinct. Invalidated/unapproved evidence must not be silently reused by a real recall service.
- Existing display labels map to memory taxonomy as follows: `Observation` -> world fact; `Learned pattern` -> derived observation; `Session context` -> experience. Normalize a provider's taxonomy at the boundary.
- `sourceFactIds` link observations to their evidence. Corrections/invalidation must revoke or rebuild affected derived knowledge and cached models.
- API-generated graph nodes need stable IDs, finite `x/y` positions, a `memory` detail model, and a `sourceFacts` count. Every edge must reference existing nodes and use one of the supported relation types. Supply complete detail models so the inspector can open immediately.

## Reuse the graph without this application or FastAPI

The graph component imports no bootstrap state and makes no HTTP calls. A host can fetch from any backend and pass its data:

```tsx
import {MemoryGraph,type MemoryGraphData,type Memory} from './src/ui';

export function MemoryMap({graph,onOpen}:{
  graph:MemoryGraphData;
  onOpen:(memory:Memory)=>void;
}) {
  return <MemoryGraph
    memories={graph.nodes.map(node=>node.memory)}
    graphData={graph}
    mode="memory"
    onInspect={onOpen}
  />;
}
```

Use `mode="knowledge"` for the source-oriented labels. Omitting `graphData` uses deterministic local inference, which is suitable for this local dataset and is not an authoritative enterprise graph.

The component maintains temporary viewport and node-position state. `onInspect` hands the selected record to the host's editor, route, or details view. It does not write a memory or persist a graph layout.

For the same appearance, retain the React/Radix/Lucide dependencies, `@/` alias, Tailwind/PostCSS setup, and stylesheet order described in `frontend/README.md`. Business service changes belong in the adapter/action handlers; colors, spacing, typography, and responsive layout remain in the stylesheets.

## Context review UI and private backend handoff

The shell opens **Context Layer**, then follows **Knowledge Layer → Super Agent → Memory**. A separate **CAFE(S)** page demonstrates the context review across that journey. Source/MCP configuration and memory curation still use the existing local API.

### Connected local checks

`POST /api/context/review` accepts a structured request:

```ts
type ContextReviewRequest = {
  brief: {objective: string; region: string; period: string; metric: string; deliverable: string};
  pinnedIds: string[];
  scenario: 'ready' | 'missing_scope' | 'stale_evidence' | 'noisy_context' | 'unsafe_context' | 'draft_memory';
};
```

The frontend refreshes the report when the brief, evidence pins, scenario, source selections, or memory review state changes. It discards responses for older inputs. Reports include five check results/methods, a decision, checked time, packet ID, selected/excluded records and reasons, approximate text-token counts, the evaluated brief, and explicit limitations. Types live in `frontend/src/lib/investigation.ts`; rules live in `backend/app/context_quality.py`.

- Clarity and actionability check required task fields and the expected output.
- Fidelity checks that requested records resolve, their demo source is configured, and their version matches the fingerprint of the loaded demo corpus. It does not verify factual truth or enterprise source freshness.
- Efficiency removes duplicate/unrelated demo candidates and checks a text-size estimate. This is not a model tokenizer or a complete model-input budget.
- Memory selection uses current approval, validity, and supporting-record eligibility.
- Security checks a local read-only/source boundary and a narrow illustrative instruction heuristic. It is not enterprise authentication or comprehensive prompt-injection defense.

Scenarios modify copies of candidates; they never rewrite underlying source records or approve memory. The scenario applies to the shared demo review until **Prepared context** is restored.

### Run creation now requires context

`StudioApi.startRun(question, context)` sends `{question, context}` to `POST /api/runs`. The question must match `context.brief.objective`. Omitting context is rejected with `422`; a failed review is rejected with `409` before a run is written. The server recomputes against current workspace state, so an earlier passing preview cannot authorize a run after source selections change. `GET /api/runs/{id}` returns the saved `contextReview` snapshot; older stored runs without that field remain readable.

Existing consumers must send the structured context when creating runs. The quick-question endpoint remains a separate fixture demonstration, not a Super Agent run.

### Production mapping

Use the private-backend discovery phase in the implementation plan to map real RAG results, versions, runtime permissions, memory eligibility, agent hooks, and LangSmith traces into these view models. Remove the synthetic fault-injection scenarios from production-facing requests. Validate provider responses in the adapter, preserve unknowns, and bind reviews to authoritative task/source/policy revisions.

The UI distinguishes available records, pinned review intent, reviewed packet contents, recalled memories, and answer citations. A reviewed demo packet is not evidence of what a live LLM consumed. Source ingestion, model-based answer generation, enterprise authorization, Hindsight calls, and LangSmith tracing remain unimplemented here; agent answers are still prepared fixture responses.

Task/action drafts and pins remain browser-local. The latest run ID restores one backend run after reload. Action drafts dispatch no work. Persist investigations/actions through the real backend before claiming team-wide durable ownership or measured business outcomes.

## Verify a replacement adapter

1. Run `npm --prefix frontend test` and `npm --prefix frontend run build`.
2. Confirm bootstrap loading/error/retry, source configuration, and ordered saves.
3. Start and poll a run; verify citations use its own returned evidence.
4. Correct a memory, save/approve it, reload, and verify the canonical server state.
5. Check source permission filtering and evidence eligibility in the backend, not only the browser.
6. Verify graph IDs/relationships, node inspection, and mobile navigation with real response sizes.

The current adapter tests cover injected transports, route mapping, ordered writes, recovery after failed writes, and JSON/error handling. Backend tests exercise the local contract. Neither test suite claims a live enterprise integration.
