//devex-ui/src/pages/Index.tsx

import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { CommandIssuer } from "@/components/CommandIssuer";
import { EventStreamViewer } from "@/components/EventStreamViewer";
import { ProjectionExplorer } from "@/components/ProjectionExplorer";
import { TraceViewer } from "@/components/TraceViewer";
import { AggregateIntrospect } from "@/components/AggregateIntrospect";
import { SystemStatus } from "@/components/SystemStatus";
import { LogFooter } from "@/components/LogFooter";
import { AICompanion } from "@/components/AICompanion";
import { Settings } from "@/components/Settings";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";
import { useAppCtx } from '@/app/AppProvider';

type ActiveView = 'dashboard' | 'commands' | 'events' | 'projections' | 'traces' | 'aggregates' | 'status' | 'rewind' | 'ai' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAICompanionOpen, setIsAICompanionOpen] = useState(false);
  const { tenant, role, flags } = useAppCtx();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'commands':
        return <CommandIssuer />;
      case 'events':
        return <EventStreamViewer currentTenant={tenant} />;
      case 'projections':
        return <ProjectionExplorer currentTenant={tenant} />;
      case 'traces':
        return <TraceViewer />;
      case 'aggregates':
        return <AggregateIntrospect />;
      case 'status':
        return <SystemStatus />;
      case 'ai':
        // When AI is selected from sidebar, open the companion panel
        if (!isAICompanionOpen) {
          setIsAICompanionOpen(true);
        }
        return <Dashboard />; // Fallback to dashboard
      case 'rewind':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-6 w-6 text-blue-400" />
              <h1 className="text-2xl font-bold">Projection Rewind Tool</h1>
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-8 text-center">
                <RotateCcw className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-300 mb-1">Projection Rewind</h3>
                <p className="text-slate-500">Time-travel functionality for projections coming soon...</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'ai') {
      setIsAICompanionOpen(true);
      return;
    }
    setActiveView(view as ActiveView);
  };

  const shouldShowAICompanion = flags.ai === true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <div className="flex flex-1 pb-12"> {/* Add bottom padding for footer */}
        <Sidebar 
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        <main className="flex-1 p-6 overflow-auto">
          {renderActiveView()}
        </main>
      </div>

      <LogFooter />
      {shouldShowAICompanion && (
        <AICompanion 
          isOpen={isAICompanionOpen} 
          onToggle={() => setIsAICompanionOpen(!isAICompanionOpen)} 
        />
      )}
    </div>
  );
};

export default Index;
