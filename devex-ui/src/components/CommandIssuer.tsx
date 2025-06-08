//devex-ui/src/components/CommandIssuer.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Send, RotateCcw, Terminal, ChevronDown, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { commandRegistry } from "@/data";
import type { CommandSchema } from "@/data";
import { useCommands, useSubmitCommand } from "@/hooks/api";
import { validate } from "@/utils/schemaValidator";
import { makeExample } from "@/utils/schemaFaker";
import { toast } from "@/components/ui/sonner";
import { useAppCtx } from '@/app/AppProvider';

const generateUUID4 = (): string => {
  return crypto.randomUUID();
};

export const CommandIssuer = () => {
  const { tenant } = useAppCtx();
  const [selectedCommand, setSelectedCommand] = useState("");
  const [aggregateId, setAggregateId] = useState("");
  const [payload, setPayload] = useState("");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [payloadView, setPayloadView] = useState<"form" | "json">("form");
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Use React Query hooks
  const { data: recentCommands = [] } = useCommands(tenant, 10);
  const { mutate: submitCommandMutation, isPending: isSubmitting } = useSubmitCommand();

  const handleSubmit = () => {
    // Clear previous validation errors
    setValidationErrors([]);

    // Get the payload based on the current view
    const payloadData = payloadView === "form" ? formData : (() => {
      try {
        return JSON.parse(payload || '{}');
      } catch (e) {
        setValidationErrors(['Invalid JSON format']);
        toast.error('Invalid JSON format', {
          description: 'Please check your JSON syntax and try again.'
        });
        return null;
      }
    })();

    // If JSON parsing failed, don't proceed
    if (payloadData === null) return;

    // Validate the payload against the command schema
    const { ok, errors } = validate(selectedCommand, payloadData);

    if (!ok) {
      setValidationErrors(errors);

      // Show toast with validation errors
      toast.error('Command validation failed', {
        description: (
          <ul className="list-disc pl-4 mt-2 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        )
      });

      return;
    }

    const commandPayload = {
      id: crypto.randomUUID(),
      tenant_id: tenant,
      type: selectedCommand,
      payload: payloadData,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: crypto.randomUUID(),
        role: 'user',
        source: 'command-issuer'
      }
    };

    console.log('Submitting command:', commandPayload);

    submitCommandMutation(commandPayload, {
      onSuccess: (result) => {
        console.log('Command submission result:', result);

        toast.success(
          result.status === 'success'
            ? 'Command executed 🎉'
            : 'Command failed',
          {
            description:
              result.status === 'success'
                ? `${result.events?.length ?? 0} event(s) produced`
                : result.error
          }
        );

        // Reset form
        setSelectedCommand("");
        setAggregateId("");
        setPayload("");
        setFormData({});
        setValidationErrors([]);
      },
      onError: (error) => {
        console.error('Command submission failed:', error);

        // Show error toast
        toast.error('Command submission failed', {
          description: error instanceof Error ? error.message : 'An unknown error occurred'
        });
      }
    });
  };

  const generateAggregateId = () => {
    setAggregateId(generateUUID4());
  };


  const handleFormDataChange = (key: string, value: unknown) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);
    setPayload(JSON.stringify(newFormData, null, 2));
  };

  const handlePayloadChange = (value: string) => {
    setPayload(value);
    try {
      const parsed = JSON.parse(value);
      setFormData(parsed);
    } catch (e) {
      // Invalid JSON, keep form data as is
    }
  };


  const renderFormField = (key: string, prop: Record<string, unknown>, required: boolean) => {
    const value = formData[key] || '';
    const isIdField = key.includes('Id');

    switch (prop.type) {
      case 'string':
        return (
          <div key={key} className="flex items-center gap-3">
            <Label htmlFor={key} className="text-slate-300 min-w-[100px] text-sm">
              {key} {required && <span className="text-red-400">*</span>}
            </Label>
            <div className="flex gap-2 flex-1">
              <Input
                id={key}
                value={value}
                onChange={(e) => handleFormDataChange(key, e.target.value)}
                placeholder={`Enter ${key}`}
                className="bg-slate-800 border-slate-700 text-slate-100 h-8"
              />
              {isIdField && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleFormDataChange(key, isIdField ? crypto.randomUUID() : `sample-${key}`)}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 h-8 w-8"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      case 'number':
        return (
          <div key={key} className="flex items-center gap-3">
            <Label htmlFor={key} className="text-slate-300 min-w-[100px] text-sm">
              {key} {required && <span className="text-red-400">*</span>}
            </Label>
            <Input
              id={key}
              type="number"
              value={value}
              onChange={(e) => handleFormDataChange(key, Number(e.target.value))}
              placeholder={`Enter ${key}`}
              className="bg-slate-800 border-slate-700 text-slate-100 h-8"
            />
          </div>
        );
      case 'object':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-slate-300 text-sm">
              {key} {required && <span className="text-red-400">*</span>}
            </Label>
            <Textarea
              id={key}
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFormDataChange(key, parsed);
                } catch {
                  handleFormDataChange(key, e.target.value);
                }
              }}
              placeholder={`Enter ${key} as JSON`}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm h-20"
            />
          </div>
        );
      default:
        return (
          <div key={key} className="flex items-center gap-3">
            <Label htmlFor={key} className="text-slate-300 min-w-[100px] text-sm">
              {key} {required && <span className="text-red-400">*</span>}
            </Label>
            <Input
              id={key}
              value={value}
              onChange={(e) => handleFormDataChange(key, e.target.value)}
              placeholder={`Enter ${key}`}
              className="bg-slate-800 border-slate-700 text-slate-100 h-8"
            />
          </div>
        );
    }
  };

  const selectedCommandSchema = commandRegistry.find(cmd => cmd.type === selectedCommand);

  const toggleCommandExpansion = (commandId: string) => {
    setExpandedCommand(expandedCommand === commandId ? null : commandId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-blue-400" />
        <h1 className="text-2xl font-bold">Command Issuer</h1>
        <Badge variant="outline" className="border-slate-600 text-slate-300">
          Tenant: {tenant}
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
                <Select value={selectedCommand} onValueChange={(value) => {
                  setSelectedCommand(value);
                  setFormData({});
                  setPayload("");
                }}>
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

            {selectedCommandSchema && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Payload</h3>

                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <Tabs value={payloadView} onValueChange={(value: "form" | "json") => setPayloadView(value)}>
                      <TabsList className="grid w-full grid-cols-2 bg-slate-700 mb-4">
                        <TabsTrigger value="form" className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100">
                          Form
                        </TabsTrigger>
                        <TabsTrigger value="json" className="data-[state=active]:bg-slate-600 data-[state=active]:text-slate-100">
                          JSON
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="form" className="space-y-3 mt-0">
                        {Object.entries(selectedCommandSchema.schema.properties).map(([key, prop]: [string, Record<string, unknown>]) => 
                          renderFormField(key, prop, selectedCommandSchema.schema.required?.includes(key) || false)
                        )}
                      </TabsContent>

                      <TabsContent value="json" className="mt-0">
                        <Textarea
                          value={payload}
                          onChange={(e) => handlePayloadChange(e.target.value)}
                          placeholder={selectedCommandSchema ? JSON.stringify(makeExample(selectedCommandSchema.schema), null, 2) : '{}'}
                          className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm min-h-32"
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="text-xs text-slate-400 mt-3">
                      Required fields: {selectedCommandSchema.schema.required?.join(', ') || 'None'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md">
                <div className="flex items-center gap-2 mb-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Validation errors</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-300">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                onClick={handleSubmit}
                disabled={!selectedCommand || isSubmitting}
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
                  onClick={() => {
                    const schema = selectedCommandSchema?.schema;
                    if (!schema) return;
                    const example = JSON.stringify(makeExample(schema), null, 2);
                    setPayload(example);
                    setFormData(JSON.parse(example));
                    setValidationErrors([]);
                  }}
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
            <div className="space-y-2">
              {recentCommands.map((cmd) => (
                <div key={cmd.id} className="space-y-2">
                  <div 
                    className="flex items-center justify-between p-2 bg-slate-800 rounded cursor-pointer hover:bg-slate-750"
                    onClick={() => toggleCommandExpansion(cmd.id)}
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-300 flex-1 min-w-0">
                      {expandedCommand === cmd.id ? (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                      {
                        cmd.createdAt && <span className="text-slate-500">
                        {new Date(cmd.createdAt).toLocaleString(undefined, {
                          hour:   '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                       </span>
                      }
                      <span className="text-slate-400 font-mono truncate">{cmd.id}</span>
                      <span className="text-slate-200 truncate">{cmd.type}</span>
                    </div>

                    <Badge 
                      variant={
                        ({
                          pending:   'secondary',
                          processed: 'default',
                          consumed:  'default',
                          failed:    'destructive',
                        } as const)[cmd.status]
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {cmd.status}
                    </Badge>
                  </div>

                  {expandedCommand === cmd.id && (
                    <div key={`${cmd.id}-details`} className="ml-5 p-3 bg-slate-800/50 rounded text-xs space-y-2">
                      <span className="text-slate-400 font-medium">
                        {new Date(cmd.createdAt).toLocaleString(undefined, {
                          year:   '2-digit',
                          month:   '2-digit',
                          day:   '2-digit',
                          hour:   '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <div>
                        <div className="text-slate-400 font-medium mb-1">Payload:</div>
                        <pre className="text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(cmd.payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium mb-1">Response:</div>
                        <pre className="text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(cmd.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
