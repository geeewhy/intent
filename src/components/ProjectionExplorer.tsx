
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

interface ProjectionExplorerProps {
  currentTenant: string;
}

export const ProjectionExplorer = ({ currentTenant }: ProjectionExplorerProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Projection Explorer</h1>
        <Badge variant="outline" className="border-slate-600 text-slate-300">
          Tenant: {currentTenant}
        </Badge>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <Database className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">Projection Explorer</h3>
          <p className="text-slate-500">Interactive projection viewer coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};
