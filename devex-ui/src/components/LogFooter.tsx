//devex-ui/src/components/LogFooter.tsx

import { useState } from "react";
import { Terminal, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockLogs = [
  { id: 1, timestamp: '14:32:15', level: 'info', message: 'Event appended: UserCreated', category: 'event' },
  { id: 2, timestamp: '14:32:16', level: 'success', message: 'Projection updated: UserProfile', category: 'projection' },
  { id: 3, timestamp: '14:32:17', level: 'warning', message: 'Saga timeout detected: OrderProcessing', category: 'saga' },
  { id: 4, timestamp: '14:32:18', level: 'error', message: 'Policy denied: InsufficientPermissions', category: 'policy' },
  { id: 5, timestamp: '14:32:19', level: 'info', message: 'Snapshot applied: User-123', category: 'snapshot' },
];

export const LogFooter = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lastLog = mockLogs[mockLogs.length - 1];
  
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
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed bottom-12 left-0 right-0 bg-slate-900 border-t border-slate-700 max-h-80 overflow-hidden z-40">
          <Card className="bg-transparent border-0 rounded-none">
            <CardContent className="p-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mockLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 font-mono text-xs">{log.timestamp}</span>
                    <Badge className={`text-xs ${getCategoryBadge(log.category)}`}>
                      {log.category}
                    </Badge>
                    <span className={`${getLevelColor(log.level)} font-medium`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
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
          <span className="text-xs text-slate-500 font-mono">{lastLog.timestamp}</span>
          <Badge className={`text-xs ${getCategoryBadge(lastLog.category)}`}>
            {lastLog.category}
          </Badge>
          <span className={`text-xs ${getLevelColor(lastLog.level)}`}>
            {lastLog.level.toUpperCase()}
          </span>
          <span className="text-sm text-slate-300 truncate">{lastLog.message}</span>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto p-1 hover:bg-slate-800 rounded transition-colors"
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
