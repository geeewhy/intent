
import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CommandIssuer } from "@/components/CommandIssuer";
import { EventStreamViewer } from "@/components/EventStreamViewer";
import { ProjectionExplorer } from "@/components/ProjectionExplorer";
import { TraceViewer } from "@/components/TraceViewer";
import { AggregateIntrospect } from "@/components/AggregateIntrospect";
import { SystemStatus } from "@/components/SystemStatus";
import { LogFooter } from "@/components/LogFooter";
import { AICompanion } from "@/components/AICompanion";

type ActiveView = 'commands' | 'events' | 'projections' | 'traces' | 'aggregates' | 'status' | 'rewind' | 'ai' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('commands');
  const [currentTenant, setCurrentTenant] = useState('tenant-1');
  const [currentRole, setCurrentRole] = useState('admin');
  const [isAICompanionOpen, setIsAICompanionOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeView) {
      case 'commands':
        return <CommandIssuer currentTenant={currentTenant} />;
      case 'events':
        return <EventStreamViewer currentTenant={currentTenant} />;
      case 'projections':
        return <ProjectionExplorer currentTenant={currentTenant} />;
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
        return <CommandIssuer currentTenant={currentTenant} />; // Fallback to commands
      case 'rewind':
        return <div className="p-6 text-slate-300">Projection Rewind Tool - Coming Soon</div>;
      case 'settings':
        return <div className="p-6 text-slate-300">Settings - Coming Soon</div>;
      default:
        return <CommandIssuer currentTenant={currentTenant} />;
    }
  };

  const handleViewChange = (view: string) => {
    if (view === 'ai') {
      setIsAICompanionOpen(true);
      return;
    }
    setActiveView(view as ActiveView);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header 
        currentTenant={currentTenant}
        currentRole={currentRole}
        onTenantChange={setCurrentTenant}
        onRoleChange={setCurrentRole}
      />
      
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
      <AICompanion 
        isOpen={isAICompanionOpen} 
        onToggle={() => setIsAICompanionOpen(!isAICompanionOpen)} 
      />
    </div>
  );
};

export default Index;
