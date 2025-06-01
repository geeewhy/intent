# Projection Drift Check Tool

A tool for checking drift between projection definitions in code and actual database tables.

## Overview

The Projection Drift Check Tool analyzes the structure of projection tables in the database and compares them with the expected structure defined in code. It identifies issues such as:

- Missing columns in the database
- Extra columns in the database
- Case or underscore inconsistencies between code and database

This tool helps maintain consistency between your code and database schema, preventing runtime errors and data integrity issues.

## Usage

### Basic Usage

```bash
# Run the drift check
npm run tool:projection-check-drift

# Output the report to a file
npm run tool:projection-check-drift -- --out=drift-report.json
```

### Programmatic Usage

You can also use this tool programmatically in your own scripts:

```typescript
import { main } from '../tools/projections-drift-check';

async function myScript() {
  await main();
  // Additional logic...
}
```

## How It Works

1. The tool scans for projection metadata in `src/domain/*/projections/**/register.ts` files
2. For each projection, it:
   - Extracts the expected table name and column definitions
   - Queries the database for the actual table structure
   - Compares expected vs. actual columns
   - Reports any discrepancies

## Output Format

The tool provides two output formats:

### Console Output

For each projection, the tool outputs:
- `[OK]` if no issues are found
- `[DRIFT]` followed by a list of issues if drift is detected

Example:
```
[OK] users.userDetails matches

[DRIFT] orders.orderSummary (order_summary)
  ❌ Missing in DB: 'totalAmount'
  ⚠️ Extra in DB: 'created_by'
  ⚠️ Field drift: 'orderDate' in code vs 'order_date' in DB
```

### JSON Output

When using the `--out` option, the tool writes a JSON report with the following structure:

```json
[
  {
    "projection": "users.userDetails",
    "table": "user_details",
    "issues": []
  },
  {
    "projection": "orders.orderSummary",
    "table": "order_summary",
    "issues": [
      "❌ Missing in DB: 'totalAmount'",
      "⚠️ Extra in DB: 'created_by'",
      "⚠️ Field drift: 'orderDate' in code vs 'order_date' in DB"
    ]
  }
]
```

## Exit Codes

- `0`: No drift detected or output written to file
- `1`: Drift detected (when not writing to file)

This allows the tool to be used in CI/CD pipelines to fail builds when drift is detected.

## Environment Variables

The tool uses the following environment variables for database connection:

- `LOCAL_DB_HOST`: Database host (default: 'localhost')
- `LOCAL_DB_PORT`: Database port (default: '5432')
- `LOCAL_DB_USER`: Database user (default: 'postgres')
- `LOCAL_DB_PASSWORD`: Database password (default: 'postgres')
- `LOCAL_DB_NAME`: Database name (default: 'postgres')