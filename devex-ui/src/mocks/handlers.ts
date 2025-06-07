import { http, HttpResponse, delay } from 'msw';
import { mockEvents } from '../data/mockEvents';
import { mockCommands, recentCommands } from '../data/mockCommands';
import { mockTraces } from '../data/mockTraces';

export const handlers = [
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

    const filteredEvents = mockEvents
      .filter(event => event.tenant_id === tenantId)
      .slice(0, limit);

    await delay(500);
    return HttpResponse.json(filteredEvents);
  }),

  http.get('/api/events/:eventId', async ({ params }) => {
    const { eventId } = params;
    const event = mockEvents.find(event => event.id === eventId);

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

    const filteredCommands = mockCommands
      .filter(command => command.tenant_id === tenantId)
      .slice(0, limit);

    await delay(300);
    return HttpResponse.json(filteredCommands);
  }),

  http.post('/api/commands', async ({ request }) => {
    const command = await request.json();
    const commandId = `cmd-${Date.now()}`;
    const success = Math.random() > 0.1; // 90% success rate

    await delay(1000);

    if (success) {
      return HttpResponse.json({ 
        success: true, 
        commandId, 
        message: 'Command submitted successfully' 
      });
    } else {
      return new HttpResponse(
        JSON.stringify({ success: false, commandId, message: 'Command failed to process' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }),

  http.get('/api/commands/recent', async ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 10;

    await delay(200);
    return HttpResponse.json(recentCommands.slice(0, limit));
  }),

  // Traces handlers
  http.get('/api/traces/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const searchTerm = query.toLowerCase();

    const filteredTraces = mockTraces.filter(trace => 
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
    const traces = mockTraces.filter(trace => trace.correlationId === correlationId);

    // Generate edges based on causation relationships
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

    await delay(300);
    return HttpResponse.json({ traces, edges });
  }),

  http.get('/api/traces/:traceId', async ({ params }) => {
    const { traceId } = params;
    const trace = mockTraces.find(trace => trace.id === traceId);

    if (!trace) {
      return new HttpResponse(
        JSON.stringify({ error: 'Trace not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await delay(150);
    return HttpResponse.json(trace);
  })
];
