//devex-ui/src/components/EventStreamViewer.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Filter, Clock, X } from "lucide-react";
import type { Event } from "@/data";
import { useEvents } from "@/hooks/api";
import { useQueryClient } from "@tanstack/react-query";

interface EventStreamViewerProps {
  currentTenant: string;
}

export const EventStreamViewer = ({ currentTenant }: EventStreamViewerProps) => {
  const [filter, setFilter] = useState("");
  const [isLive, setIsLive] = useState(true);
  const queryClient = useQueryClient();

  // Function to handle filter icon click
  const handleFilterClick = (value: string) => {
    setFilter(value);
  };

  // Function to reset the filter
  const resetFilter = () => {
    setFilter("");
  };

  // Use the events hook for data fetching and live updates
  const { data: events = [], isFetching } = useEvents(currentTenant, 50, { enabled: isLive });

  // If live mode is paused, cancel the query
  const toggleLiveMode = () => {
    if (isLive) {
      // Pause live mode
      queryClient.cancelQueries({ queryKey: ['events', currentTenant] });
    }
    setIsLive(!isLive);
  };

  const filteredEvents = events.filter(event => {
    if (!filter) return event.tenant_id === currentTenant;

    const searchTerm = filter.toLowerCase();
    return event.tenant_id === currentTenant && (
        event.type?.toLowerCase().includes(searchTerm) ||
        event.aggregateId?.toLowerCase().includes(searchTerm) ||
        event.aggregateType?.toLowerCase().includes(searchTerm) ||
        event.metadata?.causationId?.toLowerCase().includes(searchTerm) ||
        event.metadata?.correlationId?.toLowerCase().includes(searchTerm) ||
        event.metadata?.userId?.toLowerCase().includes(searchTerm) ||
        event.metadata?.requestId?.toLowerCase().includes(searchTerm) ||
        event.metadata?.source?.toLowerCase().includes(searchTerm)
    );
  });

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-green-400" />
          <h1 className="text-2xl font-bold">Event Stream</h1>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            Tenant: {currentTenant}
          </Badge>
          {isLive && (
            <Badge className="bg-green-600 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-100 w-64"
            />
            {filter && (
              <X 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-300 hover:text-slate-800 cursor-pointer bg-slate-900 bg-opacity-80 rounded-md p-1"
                onClick={resetFilter}
              />
            )}
          </div>

          <Button
            variant={isLive ? "default" : "outline"}
            onClick={toggleLiveMode}
            className={isLive ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300"}
          >
            {isLive ? "Pause" : "Resume"} Live
            {isFetching && isLive && <span className="ml-2">•</span>}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600">{event.type}</Badge>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {event.aggregateType}
                  </Badge>
                  <span className="text-sm text-slate-400">v{event.version}</span>
                  {event.status && (
                    <Badge variant={event.status === 'processed' ? 'default' : 'destructive'} className="text-xs">
                      {event.status}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {event.metadata?.timestamp && formatTimestamp(event.metadata.timestamp)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Aggregate ID:</div>
                  <div className="flex items-center gap-2">
                    <div className="text-slate-100 font-mono">{event.aggregateId}</div>
                    <Filter
                      className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                      onClick={() => handleFilterClick(event.aggregateId || '')}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">Correlation ID:</div>
                  <div className="flex items-center gap-2">
                    <div className="text-slate-100 font-mono">{event.metadata?.correlationId || 'N/A'}</div>
                    {event.metadata?.correlationId && (
                      <Filter
                        className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                        onClick={() => handleFilterClick(event.metadata.correlationId)}
                      />
                    )}
                  </div>
                </div>

                {event.metadata?.causationId && (
                  <div>
                    <div className="text-slate-400">Causation ID:</div>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-100 font-mono">{event.metadata.causationId}</div>
                      <Filter
                        className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                        onClick={() => handleFilterClick(event.metadata.causationId)}
                      />
                    </div>
                  </div>
                )}

                  {event.metadata?.source && (<div>
                  <div className="text-slate-400">Source:</div>
                  <div className="flex items-center gap-2">
                    <div className="text-slate-100">{event.metadata?.source || 'Unknown'}</div>
                    {event.metadata?.source && event.metadata.source !== 'Unknown' && (
                      <Filter
                        className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                        onClick={() => handleFilterClick(event.metadata.source)}
                      />
                    )}
                  </div>
                </div>
                  )}

                {event.metadata?.requestId && (
                  <div>
                    <div className="text-slate-400">Request ID:</div>
                    <div className="flex items-center gap-2">
                      <div className="text-slate-100 font-mono">{event.metadata.requestId}</div>
                      <Filter
                        className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                        onClick={() => handleFilterClick(event.metadata.requestId)}
                      />
                    </div>
                  </div>
                )}

                {event.metadata?.userId && (
                      <div>
                          <div className="text-slate-400">User ID:</div>
                          <div className="flex items-center gap-2">
                              <div className="text-slate-100 font-mono">{event.metadata.userId}</div>
                              <Filter
                                  className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-200"
                                  onClick={() => handleFilterClick(event.metadata.userId)}
                              />
                          </div>
                      </div>
                )}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                  Show Payload & Metadata
                </summary>
                <div className="mt-2 p-3 bg-slate-800 rounded-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-400 mb-1">Payload:</div>
                      <pre className="text-xs text-slate-100 font-mono bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-400 mb-1">Metadata:</div>
                      <pre className="text-xs text-slate-100 font-mono bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-300 mb-1">No Events Found</h3>
            <p className="text-slate-500">
              {filter ? "Try adjusting your filter criteria" : "Waiting for events..."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
