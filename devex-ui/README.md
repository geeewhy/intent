# Intent Developer Experience (DevX) Companion

A developer side-panel for simulating and inspecting event-sourced systems. Supports mock and real APIs, with in-memory data and live visualizations.

## Demo

You can see it in action at: https://intent.heart.dev/devx

## Features

- Command issuer to test your flows
- Event stream viewer with filtering and live updates
- Trace viewer for causation and correlation flows
- System metrics panel (commands, events, traces, etc.)
- Multi-tenant and role context switching
- Realtime logs on your ops
- Mock API layer using MSW
- Feature flags for toggling experimental views / Roadmap

## Getting Started

```bash
npm install
npm dev
````

Open `http://localhost:8080` in your browser.

## Environment Variables

| Variable         | Description                | Default  |
| ---------------- | -------------------------- | -------- |
| `VITE_API_MODE`  | `'mock'` or `'real'`       | `'mock'` |
| `VITE_API_URL`   | Base URL for real API mode | `''`     |
| `VITE_SEED_SIZE` | Number of items to seed    | `200`    |

## Structure

* `src/components/`  --  UI panels and shared components
* `src/pages/`  --  Routed views
* `src/mocks/`  --  Mock data, stores, handlers
* `src/data/`  --  Types, API client, command registry
* `src/hooks/`  --  Query and stream hooks
* `src/app/`  --  Global context and providers

## Modifications

* Initial iteration with made with lovable;
  * Kept component structure same
  * Still uses lovable-tagger to easily modify interface through AI
  * Further iterations not tested if it's still compatible
    Add this section to your README to help others understand how to work with or change the mock data:
* Modifying Mock Data
  * `src/mocks/factories/`
    Factories for creating mock data (`makeEvent`, `makeCommand`, etc.)
  * `src/mocks/stores/`
    In-memory stores (`eventStore`, `commandStore`, etc.) seeded with mock data on startup
  * `src/mocks/handlers.ts`
    MSW API handlers that simulate backend responses for `/api/commands`, `/api/events`, `/api/metrics`, etc.
  * `src/mocks/scenarios/default.ts`
    Default seeding logic for commands, events, traces, logs
  * `src/data/commandRegistry.ts`
    Defines available command types and their JSON schema for validation and form rendering
  * `src/utils/schemaFaker.ts`
    Generates example payloads from command schemas (used in "Use Example" in CommandIssuer)

To change what’s returned or generated, edit the corresponding factory or the seed logic in `default.ts`. To control shape or validation of command input, update the `commandRegistry` schema.

### Support for AI

AI / MCP server planned. Contrib welcome.

<3