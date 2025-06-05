
import { useState, useEffect } from "react";
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

type ActiveView = 'dashboard' | 'commands' | 'events' | 'projections' | 'traces' | 'aggregates' | 'status' | 'rewind' | 'ai' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [currentTenant, setCurrentTenant] = useState('tenant-1');
  const [currentRole, setCurrentRole] = useState('admin');
  const [isAICompanionOpen, setIsAICompanionOpen] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadFeatureFlags = () => {
      const saved = localStorage.getItem('feature_flags');
      setFeatureFlags(saved ? JSON.parse(saved) : {});
    };

    loadFeatureFlags();

    // Listen for feature flag updates
    const handleFeatureFlagsUpdate = () => {
      loadFeatureFlags();
    };

    window.addEventListener('featureFlagsUpdated', handleFeatureFlagsUpdate);
    
    return () => {
      window.removeEventListener('featureFlagsUpdated', handleFeatureFlagsUpdate);
    };
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
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
        return <Dashboard />; // Fallback to dashboard
      case 'rewind':
        return <div className="p-6 text-slate-300">Projection Rewind Tool - Coming Soon</div>;
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

  const shouldShowAICompanion = featureFlags.ai === true;

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
