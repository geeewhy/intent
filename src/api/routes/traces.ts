import { Router } from 'express';
import pool from '../db';

const router = Router();

// Helper function to convert an event row to a TraceNode
const rowToTraceNode = (row: any) => ({
  id: row.id,
  type: 'Event',
  subtype: row.type,
  timestamp: row.created_at,
  correlationId: row.correlation_id,
  causationId: row.causation_id,
  aggregateId: row.aggregate_id,
  tenantId: row.tenant_id,
  level: 0
});

// Helper function to convert a command row to a TraceNode
const rowToTraceNodeCommand = (row: any) => {
  // Log the raw command row for debugging
  console.log(`Processing command row:`, JSON.stringify(row, null, 2));

  // Try to get correlationId from different possible locations
  const correlationId = row.metadata?.correlationId || row.metadata?.['correlationId'] || row.correlationId;

  return {
    id: row.id,
    type: 'Command',
    subtype: row.type,
    timestamp: row.created_at,
    correlationId: correlationId,
    causationId: undefined,
    aggregateId: row.payload?.aggregateId,
    tenantId: row.tenant_id,
    level: 0
  };
};

// Helper function to convert a snapshot row to a TraceNode
const rowToTraceNodeSnapshot = (row: any) => ({
  id: `snapshot-${row.id}`,
  type: 'Snapshot',
  subtype: row.type,
  timestamp: row.updated_at,
  correlationId: null,
  causationId: null,
  aggregateId: row.id,
  tenantId: row.tenant_id,
  level: 0
});

// Helper function to assign levels to trace nodes based on causation and snapshot relationships
const assignLevels = (nodes: any[], edges: any[] = []): any[] => {
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const levels = new Map<string, number>();

  // Create a map of snapshot backlinks (to -> from)
  const snapshotBacklinks = new Map<string, string>();
  for (const edge of edges) {
    if (edge.type === 'snapshot') {
      snapshotBacklinks.set(edge.to, edge.from);
    }
  }

  function computeLevel(id: string): number {
    if (levels.has(id)) return levels.get(id)!;

    const node = idToNode.get(id);
    if (!node) {
      levels.set(id, 0);
      return 0;
    }

    const parentId = node.causationId || (snapshotBacklinks.get(node.id) ?? null);
    if (!parentId || !idToNode.has(parentId)) {
      levels.set(id, 0);
      return 0;
    }

    const parentLevel = computeLevel(parentId);
    const level = parentLevel + 1;
    levels.set(id, level);
    return level;
  }

  // Compute levels for all nodes
  nodes.forEach(node => computeLevel(node.id));

  // Return a new array with updated levels
  return nodes.map(node => ({
    ...node,
    level: levels.get(node.id) || 0
  }));
};

// Helper function to generate edges between traces
const generateEdges = (traces: { id: string; type: string; causationId?: string; aggregateId?: string }[]) => {
  const seen = new Set<string>();
  const edges = [];

  // Create a map of aggregate IDs to their last event
  const aggregateIdToLastEventMap = new Map<string, string>();

  // First pass: collect causation edges and build aggregate map
  for (const trace of traces) {
    // Add causation edges for events
    if ((trace.type === 'Event' || trace.type === 'Command') && trace.causationId) {
      const k = trace.causationId + '→' + trace.id;
      if (!seen.has(k)) {
        seen.add(k);
        edges.push({ from: trace.causationId, to: trace.id, type: 'causation' as const });
      }
    }

    // Track the last event for each aggregate ID
    if (trace.type === 'Event' && trace.aggregateId) {
      aggregateIdToLastEventMap.set(trace.aggregateId, trace.id);
    }
  }

  // Second pass: add snapshot edges
  for (const trace of traces) {
    // Add edges from the last event of an aggregate to its snapshot
    if (trace.type === 'Snapshot' && trace.aggregateId && aggregateIdToLastEventMap.has(trace.aggregateId)) {
      const lastEventId = aggregateIdToLastEventMap.get(trace.aggregateId)!;
      const k = lastEventId + '→' + trace.id;
      if (!seen.has(k)) {
        seen.add(k);
        edges.push({ from: lastEventId, to: trace.id, type: 'snapshot' as const });
      }
    }
  }

  return edges;
};

// GET /api/traces/search?query=...
// Search traces by id, correlation_id, causation_id, aggregate_id, or type
router.get('/api/traces/search', async (req, res) => {
  const query = req.query.query as string;
  if (!query) return res.status(400).json({ error: 'query parameter is required' });

  const client = await pool.connect();
  try {
    // Search events
    const eventsResult = await client.query(
      `SELECT * FROM infra.event_metadata 
       WHERE id::text ILIKE $1 
       OR correlation_id::text ILIKE $1 
       OR causation_id::text ILIKE $1 
       OR aggregate_id::text ILIKE $1 
       OR type ILIKE $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [`%${query}%`]
    );

    // Search commands
    const commandsResult = await client.query(
      `SELECT * FROM infra.commands 
       WHERE id::text ILIKE $1 
       OR metadata->>'correlationId'::text ILIKE $1 
       OR type ILIKE $1
       ORDER BY created_at DESC
       LIMIT 25`,
      [`%${query}%`]
    );

    // Search snapshots (aggregates)
    const snapshotsResult = await client.query(
      `SELECT * FROM infra.aggregates 
       WHERE id::text ILIKE $1 
       OR type ILIKE $1
       ORDER BY updated_at DESC
       LIMIT 25`,
      [`%${query}%`]
    );

    // Combine all results - Commands should appear before Events at the same level
    const traces = [
      ...commandsResult.rows.map(rowToTraceNodeCommand),
      ...eventsResult.rows.map(rowToTraceNode),
      ...snapshotsResult.rows.map(rowToTraceNodeSnapshot)
    ];

    // Generate edges between nodes
    const edges = generateEdges(traces);

    // Assign proper levels to nodes based on causation and snapshot relationships
    const tracesWithLevels = assignLevels(traces, edges);

    res.json(tracesWithLevels);
  } catch (error) {
    console.error('Error searching traces:', error);
    res.status(500).json({ error: 'Failed to search traces' });
  } finally {
    client.release();
  }
});

// GET /api/traces/correlation/:correlationId
// Fetch all traces with the same correlation_id
router.get('/api/traces/correlation/:correlationId', async (req, res) => {
  const { correlationId } = req.params;
  if (!correlationId) return res.status(400).json({ error: 'correlationId is required' });

  const client = await pool.connect();
  try {
    // Fetch events with matching correlation_id
    const eventsResult = await client.query(
      `SELECT * FROM infra.event_metadata 
       WHERE correlation_id::text = $1
       ORDER BY created_at ASC`,
      [correlationId]
    );

    // Fetch commands with matching correlationId in metadata
    // Try different ways the correlationId might be stored
    const commandsResult = await client.query(
      `SELECT * FROM infra.commands 
       WHERE metadata->>'correlationId' = $1
       OR metadata->>'correlation_id'::text = $1
       OR id::text = $1
       ORDER BY created_at ASC`,
      [correlationId]
    );

    // Log the raw command results for debugging
    console.log(`Raw command results for correlationId ${correlationId}:`, JSON.stringify(commandsResult.rows, null, 2));

    // Get all events and commands
    const events = eventsResult.rows.map(rowToTraceNode);
    const commands = commandsResult.rows.map(rowToTraceNodeCommand);

    // Log the processed commands for debugging
    console.log(`Processed commands for correlationId ${correlationId}:`, JSON.stringify(commands, null, 2));

    // Extract aggregate IDs from events and commands to fetch relevant snapshots
    const aggregateIds = new Set<string>();
    [...events, ...commands].forEach(item => {
      if (item.aggregateId) {
        aggregateIds.add(item.aggregateId);
      }
    });

    // Fetch snapshots for the involved aggregates
    let snapshots: any[] = [];
    if (aggregateIds.size > 0) {
      const snapshotsResult = await client.query(
        `SELECT * FROM infra.aggregates 
         WHERE id::text = ANY($1::text[])
         ORDER BY updated_at DESC`,
        [Array.from(aggregateIds)]
      );
      snapshots = snapshotsResult.rows.map(rowToTraceNodeSnapshot);
    }

    // Combine all results - Commands should appear before Events at the same level
    const traces = [...commands, ...events, ...snapshots];

    // Generate edges between nodes
    const edges = generateEdges(traces);

    // Assign proper levels to nodes based on causation and snapshot relationships
    const tracesWithLevels = assignLevels(traces, edges);

    // Log the number of commands and events for debugging
    console.log(`Found ${commands.length} commands and ${events.length} events for correlationId: ${correlationId}`);

    // Log the final response for debugging
    console.log(`Final response for correlationId ${correlationId}:`, JSON.stringify({ traces: tracesWithLevels, edges }, null, 2));

    res.json({ traces: tracesWithLevels, edges });
  } catch (error) {
    console.error('Error fetching traces by correlation:', error);
    res.status(500).json({ error: 'Failed to fetch traces by correlation' });
  } finally {
    client.release();
  }
});


export default router;
