//devex-ui/src/components/Settings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const FEATURE_FLAGS = [
  { id: 'ai', label: 'AI Companion' },
  { id: 'projections', label: 'Projections' },
  { id: 'rewind', label: 'Projection Rewind' },
  { id: 'aggregates', label: 'Aggregates' },
];

const getDefaultApiUri = () => {
  return import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3009/api';
};

export const Settings = () => {
  const [apiUri, setApiUri] = useState(localStorage.getItem('api_uri') || getDefaultApiUri());
  const [useBasicAuth, setUseBasicAuth] = useState(localStorage.getItem('use_basic_auth') === 'true');
  const [username, setUsername] = useState(localStorage.getItem('basic_auth_username') || '');
  const [password, setPassword] = useState(localStorage.getItem('basic_auth_password') || '');
  
  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState(() => {
    const saved = localStorage.getItem('feature_flags');
    return saved ? JSON.parse(saved) : {};
  });
  
  const { toast } = useToast();

  const handleFeatureFlagChange = (flagId: string, checked: boolean) => {
    const updatedFlags = { ...featureFlags, [flagId]: checked };
    setFeatureFlags(updatedFlags);
    localStorage.setItem('feature_flags', JSON.stringify(updatedFlags));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('featureFlagsUpdated'));
  };

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
    setApiUri(getDefaultApiUri());
    setUseBasicAuth(false);
    setUsername('');
    setPassword('');
    setFeatureFlags({});
    
    localStorage.removeItem('api_uri');
    localStorage.removeItem('use_basic_auth');
    localStorage.removeItem('basic_auth_username');
    localStorage.removeItem('basic_auth_password');
    localStorage.removeItem('feature_flags');

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('featureFlagsUpdated'));

    toast({
      title: "Settings reset",
      description: "All settings have been cleared.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-2">Configure your API connection, authentication settings, and feature flags</p>
      </div>

      {/* API Configuration Section */}
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
              placeholder={getDefaultApiUri()}
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

      {/* Feature Flags Section */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Feature Flags</CardTitle>
          <CardDescription className="text-slate-400">
            Enable or disable specific features in the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FEATURE_FLAGS.map((flag) => (
            <div key={flag.id} className="flex items-center space-x-2">
              <Checkbox
                id={flag.id}
                checked={featureFlags[flag.id] || false}
                onCheckedChange={(checked) => handleFeatureFlagChange(flag.id, checked as boolean)}
                className="border-slate-600 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor={flag.id} className="text-slate-200">
                {flag.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
