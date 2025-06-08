# Intent Developer Experience (DevX) Companion

A developer side-panel for simulating and inspecting event-sourced systems. Supports mock and real APIs, with in-memory data and live visualizations.

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

* `src/components/` — UI panels and shared components
* `src/pages/` — Routed views
* `src/mocks/` — Mock data, stores, handlers
* `src/data/` — Types, API client, command registry
* `src/hooks/` — Query and stream hooks
* `src/app/` — Global context and providers
