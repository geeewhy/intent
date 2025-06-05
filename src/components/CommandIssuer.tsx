
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Send, RotateCcw, Terminal } from "lucide-react";
import { commandRegistry, CommandSchema } from "@/data/commandRegistry";

interface CommandIssuerProps {
  currentTenant: string;
}

const recentCommands = [
  {
    id: '1',
    type: 'logMessage',
    aggregateId: 'system-123',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'success'
  },
  {
    id: '2',
    type: 'executeTest',
    aggregateId: 'test-456',
    timestamp: '2024-01-15T10:25:00Z',
    status: 'success'
  },
  {
    id: '3',
    type: 'simulateFailure',
    aggregateId: 'system-789',
    timestamp: '2024-01-15T10:20:00Z',
    status: 'failed'
  }
];

export const CommandIssuer = ({ currentTenant }: CommandIssuerProps) => {
  const [selectedCommand, setSelectedCommand] = useState("");
  const [aggregateId, setAggregateId] = useState("");
  const [payload, setPayload] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    console.log('Submitting command:', { 
      type: selectedCommand, 
      aggregateId, 
      payload: JSON.parse(payload || '{}'),
      tenant: currentTenant 
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    
    // Reset form
    setSelectedCommand("");
    setAggregateId("");
    setPayload("");
  };

  const generateAggregateId = () => {
    const selectedCommandSchema = commandRegistry.find(cmd => cmd.type === selectedCommand);
    const domain = selectedCommandSchema?.domain || 'aggregate';
    setAggregateId(`${domain}-${Math.random().toString(36).substr(2, 9)}`);
  };

  const generateExamplePayload = (commandType: string): string => {
    const commandSchema = commandRegistry.find(cmd => cmd.type === commandType);
    if (!commandSchema) return '{}';

    const example: Record<string, any> = {};
    const properties = commandSchema.schema.properties;
    const required = commandSchema.schema.required || [];

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      if (required.includes(key) || Math.random() > 0.5) {
        switch (prop.type) {
          case 'string':
            if (key.includes('Id')) {
              example[key] = `${key.replace('Id', '')}-${Math.random().toString(36).substr(2, 6)}`;
            } else if (key === 'message') {
              example[key] = "Sample log message";
            } else if (key === 'testName') {
              example[key] = "Sample Test";
            } else {
              example[key] = `sample-${key}`;
            }
            break;
          case 'number':
            example[key] = key === 'count' ? 3 : 42;
            break;
          case 'object':
            if (key === 'parameters') {
              example[key] = { "param1": "value1", "param2": 123 };
            } else {
              example[key] = {};
            }
            break;
          default:
            example[key] = null;
        }
      }
    });

    return JSON.stringify(example, null, 2);
  };

  const selectedCommandSchema = commandRegistry.find(cmd => cmd.type === selectedCommand);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Command Issuer</h1>
        <Badge variant="outline" className="border-slate-600 text-slate-300">
          Tenant: {currentTenant}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Command Form */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Issue New Command</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="command-type" className="text-slate-300">Command Type</Label>
                <Select value={selectedCommand} onValueChange={setSelectedCommand}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select command type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {commandRegistry.map((cmd) => (
                      <SelectItem key={cmd.type} value={cmd.type} className="text-slate-100 hover:bg-slate-700">
                        <div className="flex flex-col items-start">
                          <span>{cmd.type}</span>
                          <span className="text-xs text-slate-400">{cmd.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCommandSchema && (
                  <div className="text-xs text-slate-400">
                    Domain: {selectedCommandSchema.domain}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aggregate-id" className="text-slate-300">Aggregate ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="aggregate-id"
                    value={aggregateId}
                    onChange={(e) => setAggregateId(e.target.value)}
                    placeholder="e.g., system-123"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={generateAggregateId}
                    className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payload" className="text-slate-300">Payload (JSON)</Label>
              <Textarea
                id="payload"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder={selectedCommand ? generateExamplePayload(selectedCommand) : "Enter JSON payload..."}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm min-h-32"
              />
              {selectedCommandSchema && (
                <div className="text-xs text-slate-400">
                  Required fields: {selectedCommandSchema.schema.required?.join(', ') || 'None'}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSubmit}
                disabled={!selectedCommand || !aggregateId || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Command
                  </>
                )}
              </Button>
              
              {selectedCommand && (
                <Button 
                  variant="outline"
                  onClick={() => setPayload(generateExamplePayload(selectedCommand))}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Use Example
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Commands */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Commands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCommands.map((cmd) => (
                <div key={cmd.id} className="p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-100">{cmd.type}</span>
                    <Badge 
                      variant={cmd.status === 'success' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {cmd.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400">{cmd.aggregateId}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(cmd.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
