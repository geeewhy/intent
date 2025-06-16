// devex-ui/src/pages/WelcomePage.tsx
import { DocsHeader } from "@/components/DocsHeader";
import { DocsSidebar } from "@/components/DocsSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { DocsFooter } from '@/components/DocsFooter';

const WelcomePage = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <DocsHeader />

            <div className="flex flex-1">
                <DocsSidebar activeView="basics/introduction" />

                <main className="flex-1 p-6 overflow-auto max-w-4xl prose prose-invert">
                    <h1 className="text-3xl font-bold">Welcome</h1>
                    <p className="text-lg text-slate-300 mb-6">
                        Intent turns event-sourcing theory into a platform you can demo in five minutes.
                        It's a pragmatic, ports-first reference for multi-tenant, event-sourced CQRS back-ends
                        powered by TypeScript and uses Temporal for durable workflow execution.
                    </p>

                    <div className="flex flex-wrap gap-4 mb-10">
                        <a
                            href="/docs/basics/introduction"
                            className="px-6 py-3 text-lg font-medium rounded-md bg-slate-600 text-white hover:bg-slate-700 transition no-underline hover:no-underline hover:text-white"
                        >
                            Read the Docs
                        </a>
                        <a
                            href="/devx"
                            className="px-6 py-3 text-lg font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition no-underline hover:no-underline hover:text-white"
                        >
                            See it working
                        </a>
                        <a
                            href="https://github.com/geeewhy/intent"
                            target="_blank"
                            rel="noreferrer"
                            className="px-6 py-3 text-lg font-medium rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition no-underline hover:no-underline hover:text-white"
                        >
                            Explore the Code
                        </a>
                    </div>

                    <h2 className="text-2xl font-bold mt-8">Highlights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-medium text-blue-400 mb-2">Lossless backend processing</h3>
                                <p className="text-slate-300">
                                    Event-sourced core guarantees no data loss, even under retries, crashes, or partial failures.
                                    Structure follows DDD. Every command, event, and projection is persisted and replayable.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-medium text-blue-400 mb-2">Ports-first hexagon</h3>
                                <p className="text-slate-300">
                                    Technology-agnostic core logic. Adapters for PostgreSQL (event store + RLS) and
                                    Temporal (workflows) plug in via explicit, testable ports.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-medium text-blue-400 mb-2">Tenant isolation by default</h3>
                                <p className="text-slate-300">
                                    Tenant IDs propagate edge → core → infra. Row isolation in DB and namespaced
                                    workflows prevent accidental cross-tenant access or leaks.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-6">
                                <h3 className="text-xl font-medium text-blue-400 mb-2">End to end observability</h3>
                                <p className="text-slate-300">
                                    Unified structured logging with context-aware LoggerPort, customizable log levels,
                                    and error serialization. OpenTelemetry spans wrap all key flows.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
            <DocsFooter/>
        </div>
    );
};

export default WelcomePage;
