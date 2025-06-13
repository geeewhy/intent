"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = exports.memoryExporter = void 0;
// src/test/utils/otel-test-tracer.ts
const api_1 = require("@opentelemetry/api");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
exports.memoryExporter = new sdk_trace_base_1.InMemorySpanExporter();
const contextManager = new context_async_hooks_1.AsyncHooksContextManager().enable();
api_1.context.setGlobalContextManager(contextManager);
const provider = new sdk_trace_node_1.NodeTracerProvider({
    spanProcessors: [new sdk_trace_base_1.SimpleSpanProcessor(exports.memoryExporter)],
});
provider.register({ contextManager });
exports.tracer = api_1.trace.getTracer('test-tracer');
//# sourceMappingURL=otel-test-tracer.js.map