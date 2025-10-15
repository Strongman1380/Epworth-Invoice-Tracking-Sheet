import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, CheckCircle, Database, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const DataDiagnostic = () => {
  const [diagnostic, setDiagnostic] = useState<{
    isAuthenticated: boolean;
    userId: string | null;
    clientCount: number;
    assessmentCount: number;
    error: string | null;
  }>({
    isAuthenticated: false,
    userId: null,
    clientCount: 0,
    assessmentCount: 0,
    error: null
  });

  const runDiagnostic = async () => {
    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        setDiagnostic(prev => ({ ...prev, error: `Auth error: ${authError.message}` }));
        return;
      }

      let clientCount = 0;
      let assessmentCount = 0;

      if (user) {
        // Check clients
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*');
        
        if (clientsError) {
          console.error('Clients error:', clientsError);
        } else {
          clientCount = clients?.length || 0;
        }

        // Check assessments
        const { data: assessments, error: assessmentsError } = await supabase
          .from('assessment_results')
          .select('*');
        
        if (assessmentsError) {
          console.error('Assessments error:', assessmentsError);
        } else {
          assessmentCount = assessments?.length || 0;
        }
      }

      setDiagnostic({
        isAuthenticated: !!user,
        userId: user?.id || null,
        clientCount,
        assessmentCount,
        error: null
      });

    } catch (error) {
      setDiagnostic(prev => ({ 
        ...prev, 
        error: `Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          Data Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            {diagnostic.isAuthenticated ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="font-medium">Authentication</p>
              <p className="text-sm text-slate-600">
                {diagnostic.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium">User ID</p>
              <p className="text-xs text-slate-600 font-mono">
                {diagnostic.userId || 'None'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Database className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium">Clients</p>
              <p className="text-sm text-slate-600">
                {diagnostic.clientCount} found
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Database className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium">Assessments</p>
              <p className="text-sm text-slate-600">
                {diagnostic.assessmentCount} found
              </p>
            </div>
          </div>
        </div>

        {diagnostic.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{diagnostic.error}</p>
          </div>
        )}

        <Button onClick={runDiagnostic} variant="outline" className="w-full">
          Run Diagnostic Again
        </Button>

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Next steps:</strong></p>
          <p>1. If authenticated and no data: Go to Dashboard → Load Sample Data</p>
          <p>2. If authentication issues: Try logging out and back in</p>
          <p>3. If RLS issues: Check that user_id matches in database</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataDiagnostic;