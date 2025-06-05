
import { useState, useRef, useEffect } from "react";
import { GitBranch, Search, ArrowRight, ArrowDown, Command, Database, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TraceNode {
  id: string;
  type: 'Event' | 'Command' | 'Snapshot';
  subtype: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  aggregateId?: string;
  tenantId: string;
  x?: number;
  y?: number;
  level?: number;
}

interface TraceEdge {
  from: string;
  to: string;
  type: 'causation' | 'correlation';
}

interface SearchResult {
  id: string;
  type: 'Event' | 'Command' | 'Snapshot';
  subtype: string;
  correlationId: string;
  display: string;
}

export const TraceViewer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [traces, setTraces] = useState<TraceNode[]>([]);
  const [edges, setEdges] = useState<TraceEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string>("");
  const [showDiagram, setShowDiagram] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  const mockTraces: TraceNode[] = [
    {
      id: "cmd-001",
      type: "Command",
      subtype: "CreateOrder",
      timestamp: "2024-01-15T10:30:00Z",
      correlationId: "corr-123",
      tenantId: "tenant-1",
      level: 0
    },
    {
      id: "evt-001",
      type: "Event",
      subtype: "OrderCreated",
      timestamp: "2024-01-15T10:30:01Z",
      correlationId: "corr-123",
      causationId: "cmd-001",
      aggregateId: "order-456",
      tenantId: "tenant-1",
      level: 1
    },
    {
      id: "evt-002",
      type: "Event",
      subtype: "PaymentRequested",
      timestamp: "2024-01-15T10:30:02Z",
      correlationId: "corr-123",
      causationId: "evt-001",
      aggregateId: "payment-789",
      tenantId: "tenant-1",
      level: 2
    },
    {
      id: "snap-001",
      type: "Snapshot",
      subtype: "OrderAggregate",
      timestamp: "2024-01-15T10:30:03Z",
      correlationId: "corr-123",
      aggregateId: "order-456",
      tenantId: "tenant-1",
      level: 1
    }
  ];

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log("Searching for:", searchQuery);
    
    // Mock search results - filter based on query
    const results: SearchResult[] = mockTraces
      .filter(trace => 
        trace.id.includes(searchQuery) ||
        trace.correlationId.includes(searchQuery) ||
        trace.causationId?.includes(searchQuery) ||
        trace.aggregateId?.includes(searchQuery)
      )
      .map(trace => ({
        id: trace.id,
        type: trace.type,
        subtype: trace.subtype,
        correlationId: trace.correlationId,
        display: `${trace.type} - ${trace.subtype} (${trace.id})`
      }));

    setSearchResults(results);
    setShowResults(results.length > 0);
  };

  const handleResultSelect = (resultId: string) => {
    const selectedResult = searchResults.find(r => r.id === resultId);
    if (!selectedResult) return;

    setSelectedTraceId(resultId);
    setShowResults(false);
    setShowDiagram(true);

    // Load traces for the selected correlation ID
    const correlationId = selectedResult.correlationId;
    const filteredTraces = mockTraces.filter(trace => 
      trace.correlationId === correlationId
    );
    
    setTraces(filteredTraces);
    
    // Generate edges based on causation relationships
    const newEdges: TraceEdge[] = [];
    filteredTraces.forEach(trace => {
      if (trace.causationId) {
        const parent = filteredTraces.find(t => t.id === trace.causationId);
        if (parent) {
          newEdges.push({
            from: parent.id,
            to: trace.id,
            type: 'causation'
          });
        }
      }
    });
    setEdges(newEdges);

    // Auto-select the clicked result
    const selectedTrace = filteredTraces.find(t => t.id === resultId);
    if (selectedTrace) {
      setSelectedNode(selectedTrace);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'Command':
        return <Command className="h-4 w-4" />;
      case 'Event':
        return <GitBranch className="h-4 w-4" />;
      case 'Snapshot':
        return <Database className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Command':
        return 'bg-blue-500';
      case 'Event':
        return 'bg-green-500';
      case 'Snapshot':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isNodeSelected = (nodeId: string) => {
    return selectedTraceId === nodeId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch className="h-6 w-6 text-orange-400" />
        <h1 className="text-2xl font-bold">Trace Viewer</h1>
      </div>

      {/* Search Section */}
      <div className="relative">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="commandId, eventId, aggregateId, correlationId, causationId"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="bg-orange-600 hover:bg-orange-700">
            Search
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-12 z-10 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="px-4 py-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                onClick={() => handleResultSelect(result.id)}
              >
                <div className="flex items-center gap-2">
                  {getNodeIcon(result.type)}
                  <span className="text-slate-100 text-sm">{result.display}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Correlation: {result.correlationId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Landing State or Trace Visualization */}
      {!showDiagram ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center text-slate-400">
            <GitBranch className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-medium mb-2 text-slate-300">Search for Traces</h2>
            <p className="max-w-md">
              Enter a commandId, eventId, aggregateId, correlationId, or causationId to visualize the trace flow
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">Trace Diagram</CardTitle>
              </CardHeader>
              <CardContent>
                <div ref={canvasRef} className="relative min-h-96 bg-slate-950 rounded border border-slate-700 p-4 overflow-auto">
                  {traces.length > 0 ? (
                    <div className="space-y-8">
                      {/* Group nodes by level/timeline */}
                      {Array.from(new Set(traces.map(t => t.level))).sort().map(level => (
                        <div key={level} className="flex items-center gap-4">
                          <div className="text-xs text-slate-500 w-16">Level {level}</div>
                          <div className="flex items-center gap-6 flex-wrap">
                            {traces.filter(t => t.level === level).map((node, index) => (
                              <div key={node.id} className="flex items-center gap-2">
                                <div
                                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedNode?.id === node.id 
                                      ? 'border-orange-400 shadow-lg' 
                                      : 'border-slate-600 hover:border-slate-500'
                                  } ${
                                    isNodeSelected(node.id)
                                      ? 'bg-yellow-500 bg-opacity-30 border-yellow-400'
                                      : `${getNodeColor(node.type)} bg-opacity-20`
                                  }`}
                                  onClick={() => setSelectedNode(node)}
                                >
                                  <div className="flex items-center gap-2">
                                    {getNodeIcon(node.type)}
                                    <div className="text-sm">
                                      <div className="font-medium text-slate-200">
                                        {node.type}
                                      </div>
                                      <div className="text-xs text-slate-400">
                                        {node.subtype}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* Arrow to next level if there's a causation relationship */}
                                {edges.some(e => e.from === node.id) && (
                                  <ArrowRight className="h-4 w-4 text-slate-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-slate-500">
                      <div className="text-center">
                        <GitBranch className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                        <p>No traces found</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Node Details Panel */}
          <div>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg text-slate-100">Node Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(selectedNode.type)}
                      <span className="font-medium text-slate-100">{selectedNode.type}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-400">ID:</span>
                        <span className="ml-2 font-mono text-slate-100">{selectedNode.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Type:</span>
                        <span className="ml-2 text-slate-100">{selectedNode.subtype}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Timestamp:</span>
                        <span className="ml-2 text-slate-100">{selectedNode.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Correlation ID:</span>
                        <span className="ml-2 font-mono text-slate-100">{selectedNode.correlationId}</span>
                      </div>
                      {selectedNode.causationId && (
                        <div>
                          <span className="text-slate-400">Causation ID:</span>
                          <span className="ml-2 font-mono text-slate-100">{selectedNode.causationId}</span>
                        </div>
                      )}
                      {selectedNode.aggregateId && (
                        <div>
                          <span className="text-slate-400">Aggregate ID:</span>
                          <span className="ml-2 font-mono text-slate-100">{selectedNode.aggregateId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">Tenant:</span>
                        <span className="ml-2 text-slate-100">{selectedNode.tenantId}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p>Select a node to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-slate-900 border-slate-800 mt-4">
              <CardHeader>
                <CardTitle className="text-sm text-slate-100">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-blue-500 bg-opacity-20 border border-blue-500 rounded"></div>
                  <Command className="h-3 w-3 text-slate-100" />
                  <span className="text-slate-100">Commands</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-green-500 bg-opacity-20 border border-green-500 rounded"></div>
                  <GitBranch className="h-3 w-3 text-slate-100" />
                  <span className="text-slate-100">Events</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-purple-500 bg-opacity-20 border border-purple-500 rounded"></div>
                  <Database className="h-3 w-3 text-slate-100" />
                  <span className="text-slate-100">Snapshots</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 bg-yellow-500 bg-opacity-30 border border-yellow-400 rounded"></div>
                  <span className="text-slate-100">Selected Item</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-100">Causation Flow</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
