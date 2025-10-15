import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useTheme } from '../contexts/ThemeContext';
import AISetupHelper from '../components/AISetupHelper';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
      
      {/* AI Setup Status */}
      <AISetupHelper />
      
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-slate-600 dark:text-slate-400">Choose how PulsePoint looks to you. Select a theme below.</p>
            <div className="flex gap-4 pt-2">
              <Button 
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="bg-white text-black"
              >
                Light
              </Button>
              <Button 
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="bg-black text-white"
              >
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 dark:text-slate-400">Manage your account settings here.</p>
          {/* Account settings will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
