import { useState } from "react";
import { Header } from "@/components/Header";
import { DocsSidebar } from "@/components/DocsSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type ActiveView = 'welcome' | 'guidelines' | 'architecture' | 'examples' | 'references';

interface WelcomePageProps {
  onSwitchToConsole?: () => void;
}

const WelcomePage = ({ onSwitchToConsole }: WelcomePageProps) => {
  const initialView = window.location.pathname.replace(/^\/docs\//, '') as ActiveView || 'welcome';
  const [activeView, setActiveView] = useState<ActiveView>(initialView || 'welcome');
  const navigate = useNavigate();

  const renderActiveView = () => {
    switch (activeView) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome to Intent</h1>
            <p className="text-lg text-slate-300">
              Intent turns event-sourcing theory into a platform you can demo in five minutes. 
              It's a pragmatic, ports-first reference for multi-tenant, event-sourced CQRS back-ends 
              powered by TypeScript and uses Temporal for durable workflow execution.
            </p>

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
                  <h3 className="text-xl font-medium text-blue-400 mb-2">Production-grade observability</h3>
                  <p className="text-slate-300">
                    Unified structured logging with context-aware LoggerPort, customizable log levels, 
                    and error serialization. OpenTelemetry spans wrap all key flows.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'guidelines':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Guidelines</h1>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-blue-400 mb-2">Simplicity of Event Sourcing</h3>
                <p className="text-slate-300">
                  Content about simplicity of event sourcing will be added here.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-blue-400 mb-2">Initial Setup</h3>
                <p className="text-slate-300">
                  Content about initial setup will be added here.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case 'architecture':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Architecture</h1>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-blue-400 mb-2">High-level Architecture</h3>
                <p className="text-slate-300">
                  Content about high-level architecture will be added here.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case 'examples':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Examples</h1>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-blue-400 mb-2">Example Applications</h3>
                <p className="text-slate-300">
                  Content about example applications will be added here.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case 'references':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">References</h1>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium text-blue-400 mb-2">API References</h3>
                <p className="text-slate-300">
                  Content about API references will be added here.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome to Intent</h1>
            <p>Default content</p>
          </div>
        );
    }
  };

  const handleViewChange = (view: string) => {
    setActiveView(view as ActiveView);
    navigate(`/docs/${view === 'welcome' ? '' : view}`);
  };

  // Use the prop if provided, otherwise fallback to local implementation
  const handleSwitchToConsole = () => {
    if (onSwitchToConsole) {
      onSwitchToConsole();
    } else {
      // Fallback implementation
      localStorage.setItem('docs_mode', 'false');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <div className="flex flex-1">
        <DocsSidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
          onSwitchToConsole={handleSwitchToConsole}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default WelcomePage;
