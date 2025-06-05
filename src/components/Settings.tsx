
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export const Settings = () => {
  const [apiUri, setApiUri] = useState(localStorage.getItem('api_uri') || '');
  const [useBasicAuth, setUseBasicAuth] = useState(localStorage.getItem('use_basic_auth') === 'true');
  const [username, setUsername] = useState(localStorage.getItem('basic_auth_username') || '');
  const [password, setPassword] = useState(localStorage.getItem('basic_auth_password') || '');
  const { toast } = useToast();

  const handleSave = () => {
    localStorage.setItem('api_uri', apiUri);
    localStorage.setItem('use_basic_auth', useBasicAuth.toString());
    
    if (useBasicAuth) {
      localStorage.setItem('basic_auth_username', username);
      localStorage.setItem('basic_auth_password', password);
    } else {
      localStorage.removeItem('basic_auth_username');
      localStorage.removeItem('basic_auth_password');
    }

    toast({
      title: "Settings saved",
      description: "Your API configuration has been updated.",
    });
  };

  const handleReset = () => {
    setApiUri('');
    setUseBasicAuth(false);
    setUsername('');
    setPassword('');
    
    localStorage.removeItem('api_uri');
    localStorage.removeItem('use_basic_auth');
    localStorage.removeItem('basic_auth_username');
    localStorage.removeItem('basic_auth_password');

    toast({
      title: "Settings reset",
      description: "All API configuration has been cleared.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-2">Configure your API connection and authentication settings</p>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">API Configuration</CardTitle>
          <CardDescription className="text-slate-400">
            Set up your API endpoint and authentication credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api-uri" className="text-slate-200">API URI</Label>
            <Input
              id="api-uri"
              type="url"
              placeholder="https://api.example.com"
              value={apiUri}
              onChange={(e) => setApiUri(e.target.value)}
              className="bg-slate-800 border-slate-600 text-slate-100"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="basic-auth"
                checked={useBasicAuth}
                onCheckedChange={setUseBasicAuth}
              />
              <Label htmlFor="basic-auth" className="text-slate-200">
                Enable HTTP Basic Authentication
              </Label>
            </div>

            {useBasicAuth && (
              <div className="space-y-4 pl-6 border-l-2 border-slate-700">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-200">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Save Settings
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline" 
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
