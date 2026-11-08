# Reusing the UI

See [the backend integration guide](../docs/BACKEND_INTEGRATION.md) for the screen-to-service map and the exact replacement points.

## Complete studio

The studio is `src/App.tsx`. `src/main.tsx` loads bootstrap data before importing it. Set `VITE_API_BASE_URL` for a compatible API, or pass another `StudioApi` implementation to `initializeApi`. HTTP-specific code lives in `src/services/http-studio-api.ts`; shared response contracts live in `src/lib/contracts.ts`.

The studio shell currently uses one active backend and one workspace. Its prototype learning actions are explicitly called out in the integration guide. Preserve the contract or map a provider's response into it rather than adding service-specific response parsing to JSX.

## Individual components

`src/ui.ts` exports API-independent `IntelligenceOverview`, `MemoryGraph`, `McpForm`, and `Button` components and their relevant data types.

- `MemoryGraph` takes records, optional backend graph data, and an `onInspect` callback. It owns only the temporary interaction state.
- `IntelligenceOverview` takes memory records plus `onInspect`, `onBrowse`, `onGraph`, and optional `onAsk` navigation callbacks. It shows readiness, recent learning, a review action, and the interactive graph without fetching or saving data. `onAsk` should prefill a question for the user to send.
- `McpForm` validates a server name/HTTPS endpoint and invokes `onAdd`. That callback owns the backend registration/discovery operation.
- `Button` is the shared visual primitive used by the studio.

The more complex `CompoundingConsole` and `IntelligenceTools` components remain connected to the studio state and its persistence/action handlers. Reuse the complete studio contract, or lift those handlers into your host when embedding those panels separately. They are not advertised as standalone backend-free widgets.

`src/lib/memory.ts` derives overview counts from actual records. Ready-to-reuse knowledge must be confirmed, valid, and recursively supported by confirmed valid evidence. Review prioritizes source-ready records; repeated takeaway text is deduplicated for display only. The overview makes no measured accuracy or savings claims. A production recall service must enforce the same eligibility rules server-side.

## Theme and styles

Keep these app-level imports in order:

```ts
import './src/globals.css';
import './src/refinement.css';
import './src/components/memory-console.css';
import './src/components/compounding.css';
```

The entry point already imports the first two. The console imports the last two. A host rendering the graph alone needs to import its console styles itself. The styles are intended for this studio; the global theme/preflight can affect an existing host application, so include it deliberately.

`globals.css` defines the AT&T color tokens and base controls. `refinement.css` defines the minimal page layout and responsive adjustments. Component-level graph/console styles use `ci-` and `hs-` class prefixes. Retain `vendor/shadcn-tailwind-4.13.0.css`, the Tailwind/PostCSS configuration, and the `@/` -> `src/` alias when copying the components.

Run `npm ci`, `npm run dev`, `npm test`, and `npm run build` from this folder. There is no deploy command.
