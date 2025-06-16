//devex-ui/src/graph/edgeUtils.ts
export interface Edge { from:string; to:string; type:'causation' }

export function generateEdges(
  traces:{ id:string; causationId?:string }[]
):Edge[] {
  const seen = new Set<string>();
  return traces.flatMap(t=>{
    if(!t.causationId) return [];
    const k = t.causationId+'→'+t.id;
    if(seen.has(k)) return [];
    seen.add(k);
    return [{ from:t.causationId, to:t.id, type:'causation' }];
  });
}