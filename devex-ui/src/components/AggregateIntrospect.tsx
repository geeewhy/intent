//devex-ui/src/components/AggregateIntrospect.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export const AggregateIntrospect = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Aggregate Introspect</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300 mb-1">Aggregate Introspect Panel</h3>
          <p className="text-slate-500">Aggregate state viewer coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};
