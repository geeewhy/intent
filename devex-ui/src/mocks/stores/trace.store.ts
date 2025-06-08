import { createStore } from './createStore';
import { makeTrace } from '../factories/trace.factory';

// Import the TraceNode interface from the factory
import type { TraceNode } from '../factories/trace.factory';

export const traceStore = createStore<TraceNode>(1000);
traceStore.seed(() => makeTrace(), 200);

// Helper function to find traces by correlation ID
export function findTracesByCorrelationId(correlationId: string) {
  return traceStore.list(1000, trace => trace.correlationId === correlationId);
}

// Helper function to generate edges based on causation relationships
export function generateEdges(traces: TraceNode[]) {
  const edges = [];
  traces.forEach(trace => {
    if (trace.causationId) {
      const parent = traces.find(t => t.id === trace.causationId);
      if (parent) {
        edges.push({
          from: parent.id,
          to: trace.id,
          type: 'causation'
        });
      }
    }
  });
  return edges;
}