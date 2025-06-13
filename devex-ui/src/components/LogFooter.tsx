//devex-ui/src/components/LogFooter.tsx

import { useState } from "react";
import { Terminal, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLogs } from "@/hooks/api";
import { useAppCtx } from '@/app/AppProvider';

export const LogFooter = () => {
  const { tenant } = useAppCtx();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const { data: logs = [] } = useLogs(tenant, 100, { enabled: true, paused: isPaused });

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const lastLog = logs[0] || { 
    id: '', 
    timestamp: new Date().toISOString(), 
    level: 'info', 
    message: 'No logs available yet...',
    category: 'event',
    tenant_id: tenant
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-slate-300';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      event: 'bg-blue-500/20 text-blue-300',
      projection: 'bg-purple-500/20 text-purple-300',
      saga: 'bg-orange-500/20 text-orange-300',
      policy: 'bg-red-500/20 text-red-300',
      snapshot: 'bg-green-500/20 text-green-300',
    };
    return colors[category as keyof typeof colors] || 'bg-slate-500/20 text-slate-300';
  };

  return (
    <>
      {/* Last Log Metadata Panel */}
      {lastLog.id && expandedLogs.has(lastLog.id) && lastLog.meta && (
        <div className="fixed bottom-12 left-0 right-0 bg-slate-800 border-t border-slate-700 z-45">
          <div className="p-3 text-xs">
            <div className="ml-6 pl-3 border-l border-slate-700 text-slate-400">
              {Object.entries(lastLog.meta).map(([key, value]) => (
                <div key={key} className="flex gap-2 py-1">
                  <span className="font-medium text-slate-500">{key}:</span>
                  <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className={`fixed ${lastLog.id && expandedLogs.has(lastLog.id) && lastLog.meta ? 'bottom-36' : 'bottom-12'} left-0 right-0 bg-slate-900 border-t border-slate-700 max-h-80 overflow-hidden z-40`}>
          <Card className="bg-transparent border-0 rounded-none">
            <CardContent className="p-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge className={`text-xs ${getCategoryBadge(log.category)}`}>
                        {log.category}
                      </Badge>
                      <span className={`${getLevelColor(log.level)} font-medium`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-slate-300">
                        {log.message}
                        <button
                            onClick={() => toggleLogExpand(log.id)}
                            className="p-1 hover:bg-slate-800 rounded transition-colors"
                        >
                        {expandedLogs.has(log.id) ? (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                        ) : (
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                        )}
                      </button>
                      </span>
                    </div>

                    {expandedLogs.has(log.id) && log.meta && (
                      <div className="ml-6 pl-3 border-l border-slate-700 text-xs text-slate-400">
                        {Object.entries(log.meta).map(([key, value]) => (
                          <div key={key} className="flex gap-2 py-1">
                            <span className="font-medium text-slate-500">{key}:</span>
                            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 h-12 flex items-center px-4 z-50">
        <div className="flex items-center gap-3 flex-1">
          <Terminal className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-mono">
            {new Date(lastLog.timestamp).toLocaleTimeString()}
          </span>
          <Badge className={`text-xs ${getCategoryBadge(lastLog.category)}`}>
            {lastLog.category}
          </Badge>
          <span className={`text-xs ${getLevelColor(lastLog.level)}`}>
            {lastLog.level.toUpperCase()}
          </span>
          <span className="text-slate-300">
                        {lastLog.message}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="bg-slate-800 ml-auto border-slate-600 text-slate-600 hover:bg-slate-800"
          onClick={() => setIsPaused(p => !p)}
        >
          {isPaused ? "Resume" : "Pause"}
        </Button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 p-1 hover:bg-slate-800 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </div>
    </>
  );
};
