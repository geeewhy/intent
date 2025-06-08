import { createStore } from './createStore';
import { makeTrace } from '../factories/trace.factory';
import { generateEdges } from '@/graph/edgeUtils';

// Import the TraceNode interface from the factory
import type { TraceNode } from '../factories/trace.factory';

export const traceStore = createStore<TraceNode>();
traceStore.seed(() => makeTrace(), 200);

// Helper function to find traces by correlation ID
export function findTracesByCorrelationId(correlationId: string) {
  return traceStore.list(1000, trace => trace.correlationId === correlationId);
}

// re-export for backwards compatibility
export { generateEdges };

export const searchTracesFullText = (q:string)=>
  traceStore.list(1_000,t=>{
    const hay = `${t.id} ${t.correlationId} ${t.causationId} ${t.aggregateId} ${t.type} ${t.subtype}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
