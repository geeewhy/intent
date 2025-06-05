
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const SystemStatus = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold">System Status</h1>
      </div>

      <div className="p-6 text-slate-300">System Status - Coming Soon...ish...</div>
    </div>
  );
};
