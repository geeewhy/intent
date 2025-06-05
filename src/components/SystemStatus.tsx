
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export const SystemStatus = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold">System Status</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">System Status Indicators</h3>
          <p className="text-slate-500">Health monitoring dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};
