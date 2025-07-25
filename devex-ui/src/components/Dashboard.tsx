//devex-ui/src/components/Dashboard.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Terminal, GitBranch, Package, AlertTriangle } from "lucide-react";
import { useMetrics } from "@/hooks/api";
import { useState, useEffect } from "react";
import { isMock } from '@/config/apiMode';

export const Dashboard = () => {
  const { data } = useMetrics();
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  // Update memory usage every 2-3 seconds in mock mode
  useEffect(() => {
    if (isMock) {
      // Initial value
      setMemoryUsage(data?.memory || (60 + Math.floor(Math.random() * 6)));

      // Update every 2-3 seconds
      const interval = setInterval(() => {
        setMemoryUsage(60 + Math.floor(Math.random() * 6));
      }, 2000 + Math.floor(Math.random() * 1000)); // Random interval between 2-3 seconds

      return () => clearInterval(interval);
    } else {
      // In real API mode, use the value from the metrics response if available
      setMemoryUsage(data?.memory || null);
    }
  }, [data?.memory]);

  const stats = [
    {
      title: "Commands Issued",
      value: data?.commands ?? ' -- ',
      description: "Total commands processed",
      icon: Terminal,
      color: "text-blue-500"
    },
    {
      title: "Total Events",
      value: data?.totalEvents ?? ' -- ',
      description: "Events in stream",
      icon: Activity,
      color: "text-green-500"
    },
    {
      title: "Projections",
      value: data?.projections ?? ' -- ',
      description: "Active projections",
      icon: Database,
      color: "text-purple-500"
    },
    {
      title: "Traces",
      value: data?.traces ?? ' -- ',
      description: "Active traces",
      icon: GitBranch,
      color: "text-orange-500"
    },
    {
      title: "Aggregates",
      value: data?.aggregates ?? ' -- ',
      description: "Total aggregates",
      icon: Package,
      color: "text-cyan-500"
    },
    {
      title: "System Health",
      value: data?.health === 1 ? "100%" : `${Math.round(data?.health * 100)}%`,
      description: data?.health === 1 ? "All systems operational" : "Some systems degraded",
      icon: AlertTriangle,
      color: data?.health === 1 ? "text-green-500" : "text-yellow-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 mt-2">Event sourcing system overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
                <p className="text-xs text-slate-400">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Latest system events and commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Command processed: CreateUser</span>
                <span className="text-xs text-slate-400 ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Event projected: UserCreated</span>
                <span className="text-xs text-slate-400 ml-auto">5m ago</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-slate-300">Aggregate updated: UserAggregate</span>
                <span className="text-xs text-slate-400 ml-auto">8m ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">System Status</CardTitle>
            <CardDescription className="text-slate-400">
              Current system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Event Store</span>
                <span className="text-sm text-green-500">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Command Handler</span>
                <span className="text-sm text-green-500">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Projection Engine</span>
                <span className="text-sm text-green-500">Healthy</span>
              </div>
              {(memoryUsage !== null) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Memory Usage</span>
                  <span className="text-sm text-yellow-500">{memoryUsage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
