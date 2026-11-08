# Reusing the UI

See [the backend integration guide](../docs/BACKEND_INTEGRATION.md) for the screen-to-service map and the exact replacement points.

## Complete studio

The studio is `src/App.tsx`. `src/main.tsx` loads bootstrap data before importing it. Set `VITE_API_BASE_URL` for a compatible API, or pass another `StudioApi` implementation to `initializeApi`. HTTP-specific code lives in `src/services/http-studio-api.ts`; shared response contracts live in `src/lib/contracts.ts`.

The studio shell currently uses one active backend and one workspace. Its prototype learning actions are explicitly called out in the integration guide. Preserve the contract or map a provider's response into it rather than adding service-specific response parsing to JSX.

## Individual components

`src/ui.ts` exports API-independent `IntelligenceOverview`, `MemoryGraph`, `ContextReviewPanel`, `McpForm`, and `Button` components and their relevant data types.

- `MemoryGraph` takes records, optional backend graph data, and an `onInspect` callback. It owns only the temporary interaction state.
- `IntelligenceOverview` takes memory records plus `onInspect`, `onBrowse`, `onGraph`, and optional `onAsk` navigation callbacks. It shows readiness, recent learning, a review action, and the interactive graph without fetching or saving data. `onAsk` should prefill a question for the user to send.
- `McpForm` validates a server name/HTTPS endpoint and invokes `onAdd`. That callback owns the backend registration/discovery operation.
- `Button` is the shared visual primitive used by the studio.
- `ContextReviewPanel` renders supplied checks, their assessment methods/evidence references, and a backend decision. The shell now supplies live local-demo reports from the context review API; fallback preview mode never claims source or permission verification. Navigation callbacks belong to the host.

The more complex `CompoundingConsole` and `IntelligenceTools` components remain connected to the studio state and its persistence/action handlers. Reuse the complete studio contract, or lift those handlers into your host when embedding those panels separately. They are not advertised as standalone backend-free widgets.

`src/lib/memory.ts` derives overview counts from actual records. Ready-to-reuse knowledge must be confirmed, valid, and recursively supported by confirmed valid evidence. Review prioritizes source-ready records; repeated takeaway text is deduplicated for display only. The overview makes no measured accuracy or savings claims. A production recall service must enforce the same eligibility rules server-side.

## Theme and styles

Keep these app-level imports in order:

```ts
import './src/globals.css';
import './src/refinement.css';
import './src/product.css';
import './src/narrative.css';
import './src/components/memory-console.css';
import './src/components/compounding.css';
```

The entry point imports the four app stylesheets. The console imports its two stylesheets. A host rendering the graph alone needs to import its console styles itself. The styles are intended for this studio; the global theme/preflight can affect an existing host application, so include it deliberately.

`product.css` defines the investigation, evidence, action-draft, and context-review surfaces with the `pi-` prefix. `narrative.css` styles the four-stage journey and the CAFE(S) demo. `src/lib/investigation.ts` owns the browser-draft format, task/report contracts, brief snapshots, and explicitly limited fallback preview checks. Drafts use a separate storage key from backend memory and are not a substitute for production investigation persistence.

`globals.css` defines the AT&T color tokens and base controls. `refinement.css` defines the minimal page layout and responsive adjustments. Component-level graph/console styles use `ci-` and `hs-` class prefixes. Retain `vendor/shadcn-tailwind-4.13.0.css`, the Tailwind/PostCSS configuration, and the `@/` -> `src/` alias when copying the components.

Run `npm ci`, `npm run dev`, `npm test`, and `npm run build` from this folder. There is no deploy command.

`StudioApi.reviewContext(context)` drives the live local CAFE(S) page. `startRun(question, context)` now requires a structured brief and demo scenario; the local backend recomputes the checks before creating a run. See the backend integration guide for limits and production mapping.
