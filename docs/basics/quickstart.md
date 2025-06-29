# Quickstart

This guide will help you get Intent running locally in about 5 minutes.

## Prerequisites

Before you begin, ensure you have the following tools installed:

| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| **Docker** | `24.x` | Engine + CLI; enables `docker compose` used by the Quick-start. |
| **Node.js** | `22.x` (current LTS) | TS/ESM project; lower versions are not tested. |
| **Git** | any modern release | Needed to clone the repo. |
| **Unix-like shell** | bash/zsh/fish | Commands assume a POSIX shell. Windows users can use WSL2 or Git Bash (untested). |

## Setup Steps

Follow these steps to get Intent running locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/geeewhy/intent.git
   cd intent
   ```

2. **Start the required services using Docker**
   ```bash
   docker compose up -d postgres
   ```
   This starts PostgreSQL (for the event store) and Temporal (for workflow orchestration).

3. **Set up the event store**
   ```bash
   npm run setup eventstore
   ```
   This creates the necessary database schemas and seeds the Row-Level Security (RLS) policies.

4. **Configure environment variables**
   ```bash
   cp .env.local .env
   ```
   You can edit the `.env` file if you need to customize credentials or other settings. For the first setup, highly recommended to leverage generated credentials.

5. **Start the Temporal workers**
   ```bash
   npm run dev:worker aggregates  # starts the aggregates worker
   npm run dev:worker sagas       # starts the sagas worker
   ```
   These workers process commands and orchestrate workflows.

## Verifying Your Setup

After completing the steps above, you should have:

- PostgreSQL running with the event store schema
- Temporal server and UI running
- Two Temporal workers processing commands and sagas

You can verify that everything is running correctly by:

- Checking Docker containers: `docker ps` should show postgres, temporal, and temporal-ui containers running
- Accessing the Temporal UI at http://localhost:8088 to see registered workflows

## Interacting with the System

To interact with your running Intent system, you can use the DevX UI companion:

1. Navigate to the DevX UI directory:
   ```bash
   cd devex-ui
   ```

2. Install dependencies and start the UI:
   ```bash
   npm install
   npm run dev
   ```

3. Open the UI in your browser (usually http://localhost:8080). If that port is taken, the terminal will tell you where it landed.

### If it worked, you'll see:
- Active workflows in the Temporal UI
- Workers logging incoming commands
- DevX UI showing real-time event and projection updates

The DevX UI allows you to:
- Issue test commands
- Inspect events
- View traces
- Explore projections

### Steps to use DevX locally:

To use it with real data, you'll need to:
- Configure the DevX UI to connect to your Intent system
- Issue commands to your system

* Start admin API: `npm run api:admin`
* Switch to real API: http://localhost:8083/devx/settings
  * Toggle `Use real API`
  * Enter your API URL (default http://localhost:3009)

For more details on using the DevX UI, see the [DevX UI documentation](../devx/devx-ui.md).

### If it did not work... 
**Please do open an issue, so we can fix it for you:** https://github.com/geeewhy/intent/issues

## Troubleshooting

If you encounter issues:

- Ensure all Docker containers are running: `docker ps`
- Check logs for the workers: `LOG_LEVEL=debug npm run dev:worker aggregates`
- Verify your `.env` file has the correct configuration
- Make sure ports 5432 (PostgreSQL) and 7233 (Temporal) are not in use by other applications