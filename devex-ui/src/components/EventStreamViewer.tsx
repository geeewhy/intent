
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Filter, Clock } from "lucide-react";

interface Event {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: string;
  tenant: string;
  causationId?: string;
  correlationId: string;
  payload: any;
  metadata: any;
}

interface EventStreamViewerProps {
  currentTenant: string;
}

const mockEvents: Event[] = [
  {
    id: 'evt-001',
    type: 'UserCreated',
    aggregateId: 'user-123',
    aggregateType: 'User',
    version: 1,
    timestamp: '2024-01-15T10:30:15Z',
    tenant: 'tenant-1',
    correlationId: 'corr-001',
    causationId: 'cmd-001',
    payload: { email: 'user@example.com', name: 'John Doe' },
    metadata: { source: 'web-api', userId: 'admin-1' }
  },
  {
    id: 'evt-002',
    type: 'OrderPlaced',
    aggregateId: 'order-456',
    aggregateType: 'Order',
    version: 1,
    timestamp: '2024-01-15T10:29:30Z',
    tenant: 'tenant-1',
    correlationId: 'corr-002',
    causationId: 'cmd-002',
    payload: { items: [{ productId: 'prod-1', quantity: 2 }], total: 29.99 },
    metadata: { source: 'mobile-app', userId: 'user-123' }
  },
  {
    id: 'evt-003',
    type: 'PaymentProcessed',
    aggregateId: 'payment-789',
    aggregateType: 'Payment',
    version: 1,
    timestamp: '2024-01-15T10:28:45Z',
    tenant: 'tenant-2',
    correlationId: 'corr-003',
    causationId: 'cmd-003',
    payload: { amount: 29.99, method: 'credit_card', status: 'completed' },
    metadata: { source: 'payment-service', processorId: 'stripe' }
  }
];

export const EventStreamViewer = ({ currentTenant }: EventStreamViewerProps) => {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [filter, setFilter] = useState("");
  const [isLive, setIsLive] = useState(true);

  // Simulate live events
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newEvent: Event = {
        id: `evt-${Date.now()}`,
        type: ['UserUpdated', 'OrderCancelled', 'PaymentRefunded'][Math.floor(Math.random() * 3)],
        aggregateId: `aggregate-${Math.random().toString(36).substr(2, 6)}`,
        aggregateType: ['User', 'Order', 'Payment'][Math.floor(Math.random() * 3)],
        version: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date().toISOString(),
        tenant: Math.random() > 0.5 ? 'tenant-1' : 'tenant-2',
        correlationId: `corr-${Math.random().toString(36).substr(2, 8)}`,
        causationId: `cmd-${Math.random().toString(36).substr(2, 8)}`,
        payload: { randomData: Math.random() },
        metadata: { source: 'live-stream', automated: true }
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep only latest 50
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredEvents = events.filter(event => {
    if (!filter) return event.tenant === currentTenant;
    
    const searchTerm = filter.toLowerCase();
    return event.tenant === currentTenant && (
      event.type.toLowerCase().includes(searchTerm) ||
      event.aggregateId.toLowerCase().includes(searchTerm) ||
      event.aggregateType.toLowerCase().includes(searchTerm)
    );
  });

  const formatTimestamp = (timestamp: string) => {
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
          </div>
          
          <Button
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
            className={isLive ? "bg-green-600 hover:bg-green-700" : "border-slate-600 text-slate-300"}
          >
            {isLive ? "Pause" : "Resume"} Live
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
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Aggregate ID:</div>
                  <div className="text-slate-100 font-mono">{event.aggregateId}</div>
                </div>
                
                <div>
                  <div className="text-slate-400">Correlation ID:</div>
                  <div className="text-slate-100 font-mono">{event.correlationId}</div>
                </div>

                {event.causationId && (
                  <div>
                    <div className="text-slate-400">Causation ID:</div>
                    <div className="text-slate-100 font-mono">{event.causationId}</div>
                  </div>
                )}

                <div>
                  <div className="text-slate-400">Source:</div>
                  <div className="text-slate-100">{event.metadata.source}</div>
                </div>
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
