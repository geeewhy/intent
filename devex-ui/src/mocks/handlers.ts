//devex-ui/src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';
import { v4 as uuid } from 'uuid';
import { 
  eventStore, 
  commandStore, 
  recentCommandsStore, 
  traceStore, 
  findTracesByCorrelationId, 
  generateEdges, 
  logStore, 
  pushLog 
} from './stores';
import { makeEvent } from './factories/event.factory';
import { makeLog } from './factories/log.factory';

export const handlers = [
  // Logs list
  http.get('/api/logs', ({ request }) => {
    const url = new URL(request.url);
    const tenant = url.searchParams.get('tenant_id');
    const limit  = Number(url.searchParams.get('limit') || '50');
    const data   = tenant 
                    ? logStore.list(limit, l => l.tenant_id === tenant)
                    : logStore.list(limit);
    return HttpResponse.json(data);
  }),

  // Logs stream (SSE style)
  http.get('/api/logs/stream', async ({ request }) => {
    // naive: send 10 logs, 1 × sec
    const url = new URL(request.url);
    const tenant = url.searchParams.get('tenant_id') ?? 'tenant-1';

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    for (let i=0;i<10;i++) {
      const l = makeLog(tenant);
      pushLog(l);
      await writer.write(encoder.encode(`data:${JSON.stringify(l)}\n\n`));
      await delay(1000);
    }
    await writer.close();
    return new HttpResponse(readable, { headers: { 'Content-Type': 'text/event-stream' }});
  }),
  // Events handlers
  http.get('/api/events', async ({ request }) => {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;

    if (!tenantId) {
      return new HttpResponse(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const filteredEvents = eventStore.list(limit, event => event.tenant_id === tenantId);

    await delay(500);
    return HttpResponse.json(filteredEvents);
  }),

  http.get('/api/events/:eventId', async ({ params }) => {
    const { eventId } = params;
    const event = eventStore.find(eventId);

    if (!event) {
      return new HttpResponse(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await delay(200);
    return HttpResponse.json(event);
  }),

  // Commands handlers
  http.get('/api/commands', async ({ request }) => {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;

    if (!tenantId) {
      return new HttpResponse(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const filteredCommands = commandStore.list(limit, command => command.tenant_id === tenantId);

    await delay(300);
    return HttpResponse.json(filteredCommands);
  }),

  http.post('/api/commands', async ({ request }) => {
    const cmd = await request.json();       // already validated on the client

    // ensure we have an id – issuer now sends one, but just in case
    const commandId = cmd.id ?? uuid();

    // Add command to store
    commandStore.push(cmd);

    // 💡  Fake "business logic"
    const didSucceed = Math.random() > 0.1;

    // Emit 1-n mock events when the command "succeeds"
    const producedEvents = didSucceed
      ? Array.from({ length: Math.ceil(Math.random() * 3) }).map((_, i) => {
          const ev = makeEvent({
            id: `evt-${Date.now()}-${i}`,
            tenant_id: cmd.tenant_id,
            type: `${cmd.type}`,
            aggregateId: cmd.payload.aggregateId ?? 'agg-missing',
            metadata: { 
              correlationId: commandId,
              causationId: commandId
            }
          });
          eventStore.push(ev);         // append to store
          return ev;
        })
      : undefined;

    await delay(750);

    const result = {
      status : didSucceed ? 'success' : 'fail',
      events : producedEvents,
      error  : didSucceed ? undefined : 'Simulated failure'
    };

    return HttpResponse.json(result);
  }),

  http.get('/api/commands/recent', async ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 10;

    await delay(200);
    return HttpResponse.json(recentCommandsStore.list(limit));
  }),

  // Traces handlers
  http.get('/api/traces/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const searchTerm = query.toLowerCase();

    const filteredTraces = traceStore.list(1000, trace => 
      trace.id.toLowerCase().includes(searchTerm) ||
      trace.correlationId.toLowerCase().includes(searchTerm) ||
      trace.causationId?.toLowerCase().includes(searchTerm) ||
      trace.aggregateId?.toLowerCase().includes(searchTerm) ||
      trace.subtype.toLowerCase().includes(searchTerm) ||
      trace.type.toLowerCase().includes(searchTerm)
    );

    await delay(200);
    return HttpResponse.json(filteredTraces);
  }),

  http.get('/api/traces/correlation/:correlationId', async ({ params }) => {
    const { correlationId } = params;
    const traces = findTracesByCorrelationId(correlationId);
    const edges = generateEdges(traces);

    await delay(300);
    return HttpResponse.json({ traces, edges });
  }),

  http.get('/api/traces/:traceId', async ({ params }) => {
    const { traceId } = params;
    const trace = traceStore.find(traceId);

    if (!trace) {
      return new HttpResponse(
        JSON.stringify({ error: 'Trace not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await delay(150);
    return HttpResponse.json(trace);
  }),

  http.get('/api/metrics', () => {
    // Get the count of items in each store by listing all items
    const commands = commandStore.list(1000).length;
    const events   = eventStore.list(1000).length;
    const traces   = traceStore.list(1000).length;
    return HttpResponse.json({
      commands,
      events,
      projections : 89,
      traces,
      aggregates  : 67,
      health      : 1 // a number between 0 and 1, 1 = ok, <1 = trouble
    });
  })
];
