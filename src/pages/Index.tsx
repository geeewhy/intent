
import { useState } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CommandIssuer } from "@/components/CommandIssuer";
import { EventStreamViewer } from "@/components/EventStreamViewer";
import { ProjectionExplorer } from "@/components/ProjectionExplorer";
import { TraceViewer } from "@/components/TraceViewer";
import { AggregateIntrospect } from "@/components/AggregateIntrospect";
import { SystemStatus } from "@/components/SystemStatus";

type ActiveView = 'commands' | 'events' | 'projections' | 'traces' | 'aggregates' | 'status';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('commands');
  const [currentTenant, setCurrentTenant] = useState('tenant-1');
  const [currentRole, setCurrentRole] = useState('admin');

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
      default:
        return <CommandIssuer currentTenant={currentTenant} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header 
        currentTenant={currentTenant}
        currentRole={currentRole}
        onTenantChange={setCurrentTenant}
        onRoleChange={setCurrentRole}
      />
      
      <div className="flex flex-1">
        <Sidebar 
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default Index;
