# Quickstart Guide

This guide will help you get Intent running locally in about 5 minutes.

## Prerequisites

Before you begin, ensure you have the following tools installed:

| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| **Docker** | `24.x` | Engine + CLI; enables `docker compose` used by the Quick-start. |
| **Node.js** | `22.x` (current LTS) | TS/ESM project; lower versions are not tested. |
| **Git** | any modern release | Needed to clone the repo. |
| **Unix-like shell** | bash/zsh/fish | Commands assume a POSIX shell. Windows users can use WSL2 or Git Bash (untested). |

## Step-by-Step Setup

Follow these steps to get Intent running locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/geeewhy/intent.git
   cd intent
   ```

2. **Start the required services using Docker**
   ```bash
   docker compose up -d postgres temporal temporal-ui
   ```
   This starts PostgreSQL (for the event store) and Temporal (for workflow orchestration).

3. **Set up the event store**
   ```bash
   npm run setup eventstore
   ```
   This creates the necessary database schemas and seeds the Row-Level Security (RLS) policies.

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   You can edit the `.env` file if you need to customize credentials or other settings.

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

3. Open the UI in your browser (typically at http://localhost:8080), but will use different port if port is occupied. Follow what your console says.

The DevX UI allows you to:
- Issue test commands
- Inspect events
- View traces
- Explore projections

For more details on using the DevX UI, see the [DevX UI documentation](../devx/devx-ui.md).

## Troubleshooting

If you encounter issues:

- Ensure all Docker containers are running: `docker ps`
- Check logs for the workers: `LOG_LEVEL=debug npm run dev:worker aggregates`
- Verify your `.env` file has the correct configuration
- Make sure ports 5432 (PostgreSQL) and 7233 (Temporal) are not in use by other applications