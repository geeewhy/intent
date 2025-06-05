
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Send, RotateCcw } from "lucide-react";

interface CommandIssuerProps {
  currentTenant: string;
}

const commandTypes = [
  'CreateUser',
  'UpdateProfile',
  'PlaceOrder',
  'CancelOrder',
  'ProcessPayment',
  'RefundPayment'
];

const recentCommands = [
  {
    id: '1',
    type: 'CreateUser',
    aggregateId: 'user-123',
    timestamp: '2024-01-15T10:30:00Z',
    status: 'success'
  },
  {
    id: '2',
    type: 'PlaceOrder',
    aggregateId: 'order-456',
    timestamp: '2024-01-15T10:25:00Z',
    status: 'success'
  },
  {
    id: '3',
    type: 'ProcessPayment',
    aggregateId: 'payment-789',
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
    const prefix = selectedCommand.toLowerCase().includes('user') ? 'user' 
      : selectedCommand.toLowerCase().includes('order') ? 'order' 
      : selectedCommand.toLowerCase().includes('payment') ? 'payment' 
      : 'aggregate';
    setAggregateId(`${prefix}-${Math.random().toString(36).substr(2, 9)}`);
  };

  const getExamplePayload = (commandType: string) => {
    const examples = {
      'CreateUser': '{\n  "email": "user@example.com",\n  "name": "John Doe",\n  "role": "customer"\n}',
      'UpdateProfile': '{\n  "name": "Jane Doe",\n  "phoneNumber": "+1234567890"\n}',
      'PlaceOrder': '{\n  "items": [{"productId": "prod-1", "quantity": 2}],\n  "total": 29.99\n}',
      'CancelOrder': '{\n  "reason": "Customer requested cancellation"\n}',
      'ProcessPayment': '{\n  "amount": 29.99,\n  "paymentMethod": "credit_card"\n}',
      'RefundPayment': '{\n  "amount": 29.99,\n  "reason": "Product defective"\n}'
    };
    return examples[commandType as keyof typeof examples] || '{}';
  };

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
                    {commandTypes.map((cmd) => (
                      <SelectItem key={cmd} value={cmd} className="text-slate-100 hover:bg-slate-700">
                        {cmd}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aggregate-id" className="text-slate-300">Aggregate ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="aggregate-id"
                    value={aggregateId}
                    onChange={(e) => setAggregateId(e.target.value)}
                    placeholder="e.g., user-123"
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
                placeholder={selectedCommand ? getExamplePayload(selectedCommand) : "Enter JSON payload..."}
                className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm min-h-32"
              />
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
                  onClick={() => setPayload(getExamplePayload(selectedCommand))}
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
