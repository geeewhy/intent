//devex-ui/src/components/Settings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useFeatures } from '@/hooks/useFeatures';
import { loadDefault } from '@/mocks/scenarios/default';
import { isMock } from '@/config/apiMode';

// Check if API switching is disabled via environment variable
const isApiSwitchingDisabled = import.meta.env.VITE_API_NO_SWITCH === 'true';

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
  const [useRealBackend, setUseRealBackend] = useState(localStorage.getItem('api_mode') === 'real');

  // Feature flags
  const { all: featureFlags, toggle } = useFeatures();

  const { toast } = useToast();

  // Handler for resetting demo data
  const handleResetDemoData = () => {
    if (isMock) {
      loadDefault();
      toast({
        title: "Demo data reset",
        description: "All mock data has been regenerated.",
      });
    } else {
      toast({
        title: "Cannot reset demo data",
        description: "Demo data can only be reset in mock mode.",
        variant: "destructive"
      });
    }
  };

  const handleFeatureFlagChange = (flagId: string, checked: boolean) => {
    toggle(flagId, checked);
  };

  const handleSave = () => {
    // Check if API switching is disabled and the user is trying to change the API mode
    if (isApiSwitchingDisabled && (useRealBackend !== (localStorage.getItem('api_mode') === 'real'))) {
      toast({
        title: "API switching not allowed",
        description: "Switching between real and mock API is not allowed in this environment.",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('api_uri', apiUri);
    localStorage.setItem('use_basic_auth', useBasicAuth.toString());
    localStorage.setItem('api_mode', useRealBackend ? 'real' : 'mock');

    if (useBasicAuth) {
      localStorage.setItem('basic_auth_username', username);
      localStorage.setItem('basic_auth_password', password);
    } else {
      localStorage.removeItem('basic_auth_username');
      localStorage.removeItem('basic_auth_password');
    }

    toast({
      title: "Settings saved",
      description: "Your API configuration has been updated. Reload the page for changes to take effect.",
    });

    // Reload the page to apply the API mode change
    window.location.reload();
  };

  const handleReset = () => {
    setApiUri(getDefaultApiUri());
    setUseBasicAuth(false);
    setUsername('');
    setPassword('');

    // Only reset API mode if switching is allowed
    if (!isApiSwitchingDisabled) {
      setUseRealBackend(false);
      localStorage.removeItem('api_mode');
    } else if (useRealBackend !== (localStorage.getItem('api_mode') === 'real')) {
      // If switching is disabled and the user tried to change the mode, show an error
      toast({
        title: "API switching not allowed",
        description: "Switching between real and mock API is not allowed in this environment.",
        variant: "destructive"
      });
      return;
    }

    // Reset feature flags
    FEATURE_FLAGS.forEach(flag => toggle(flag.id, false));

    localStorage.removeItem('api_uri');
    localStorage.removeItem('use_basic_auth');
    localStorage.removeItem('basic_auth_username');
    localStorage.removeItem('basic_auth_password');

    toast({
      title: "Settings reset",
      description: "All settings have been cleared. Reload the page for changes to take effect.",
    });

    // Reload the page to apply the API mode change
    window.location.reload();
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
            <div>Set up your API endpoint and authentication credentials</div>
            <div>
              {isApiSwitchingDisabled && (
                  <span className="text-xs text-amber-500">(Switching disabled by environment configuration)</span>
              )}
            </div>
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
                id="real-backend"
                checked={useRealBackend}
                onCheckedChange={setUseRealBackend}
                disabled={isApiSwitchingDisabled}
              />
              <Label htmlFor="real-backend" className={`${isApiSwitchingDisabled ? 'text-slate-400' : 'text-slate-200'}`}>
                Use real backend
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="basic-auth"
                checked={useBasicAuth}
                onCheckedChange={setUseBasicAuth}
                disabled={isApiSwitchingDisabled}
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
            <Button onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isApiSwitchingDisabled}
            >
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

      {/* Demo Data Section */}
      {isMock && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Demo Data</CardTitle>
            <CardDescription className="text-slate-400">
              Reset and manage mock data for demonstrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <p className="text-slate-300 text-sm">
                Reset all mock data to regenerate events, commands, traces, and logs with fresh random data.
              </p>
              <div>
                <Button 
                  onClick={handleResetDemoData}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Reset Demo Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
