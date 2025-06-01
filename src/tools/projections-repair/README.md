# Projection Repair/Replay Tool

A tool for repairing drift between projection definitions in code and actual database tables by rebuilding tables or replaying events.

## Overview

The Projection Repair Tool helps maintain consistency between your projection definitions in code and their corresponding database tables. When drift is detected (using the Projection Drift Check Tool), this tool can:

- Rebuild tables from scratch
- Replay events to update existing tables
- Process only new events since the last checkpoint

This ensures that your read models stay in sync with your event store and code definitions.

## Usage

### Basic Usage

```bash
# Rebuild a specific table
npm run tool:projection-repair -- --table <table_name>

# Rebuild a specific projection
npm run tool:projection-repair -- --projection <projection_id>

# Rebuild all projections
npm run tool:projection-repair -- --all

# Rebuild only tables with issues from a drift report
npm run tool:projection-repair -- --drift-report <report_file.json>

# Resume mode: only replay events newer than current table state
npm run tool:projection-repair -- --resume --table <table_name>

# Show help
npm run tool:projection-repair -- --help
```

### Programmatic Usage

You can also use this tool programmatically in your own scripts:

```typescript
import { main } from '../tools/projections-repair';

async function myScript() {
  // Set process.argv as needed before calling main
  process.argv = [
    'node', 'script.js',
    '--table', 'my_projection_table'
  ];
  
  await main();
  // Additional logic...
}
```

## How It Works

1. The tool identifies target projections based on command-line arguments
2. For each target:
   - In full rebuild mode, it drops and recreates the table structure
   - In resume mode, it creates checkpoints to track event processing progress
   - It streams events from the event store to avoid memory issues
   - It applies events to the projection using the registered handlers

## Modes

### Full Rebuild Mode

In full rebuild mode (default), the tool:
1. Drops and recreates the table structure
2. Replays all events from the beginning
3. Rebuilds the projection from scratch

This is useful when:
- The table structure has changed
- The projection logic has changed significantly
- You need to ensure complete consistency

### Resume Mode

In resume mode (`--resume`), the tool:
1. Creates checkpoints to track the last processed event for each aggregate
2. Only processes events newer than the current state
3. Updates the existing projection without rebuilding from scratch

This is faster and more efficient for:
- Processing new events that arrived since the last update
- Fixing minor drift issues without a full rebuild

## Environment Variables

The tool uses the following environment variables for database connection:

- `LOCAL_DB_HOST`: Database host (default: 'localhost')
- `LOCAL_DB_PORT`: Database port (default: '5432')
- `LOCAL_DB_USER`: Database user (default: 'postgres')
- `LOCAL_DB_PASSWORD`: Database password (default: 'postgres')
- `LOCAL_DB_NAME`: Database name (default: 'postgres')

## Performance Considerations

The tool uses streaming to process events efficiently:
- Events are processed in batches to minimize memory usage
- Checkpoints are created in batches to improve performance
- For large event stores, the resume mode is significantly faster