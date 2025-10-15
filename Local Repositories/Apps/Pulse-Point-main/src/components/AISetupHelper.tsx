import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Brain, AlertCircle, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AISetupHelper: React.FC = () => {
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'not-configured'>('checking');
  const [copied, setCopied] = useState(false);
  const projectRef = 'pvmqzydaaaeelbhsejjh';

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      // Try to call the AI function with a test payload
      const { data, error } = await supabase.functions.invoke('ai-assessment-interpretation', {
        body: {
          assessmentType: 'ACE',
          score: 0,
          answers: {},
          questions: []
        }
      });

      if (error && error.message.includes('not found')) {
        setAiStatus('not-configured');
      } else if (error && error.message.includes('OPENAI_API_KEY')) {
        setAiStatus('not-configured');
      } else {
        setAiStatus('ready');
      }
    } catch (error: any) {
      console.log('AI check error:', error);
      setAiStatus('not-configured');
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (aiStatus === 'checking') {
    return null;
  }

  if (aiStatus === 'ready') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">AI Interpretation Ready</p>
              <p className="text-sm text-green-700">Assessment printouts will include AI-powered clinical insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-900 mb-1">AI Interpretation Not Configured</p>
              <p className="text-sm text-orange-700 mb-3">
                Enable AI-powered clinical insights on assessment printouts with these quick steps:
              </p>
              
              <div className="bg-white rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900 mb-2">1. Get OpenAI API Key (2 minutes)</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Get API Key
                  </Button>
                  <p className="text-xs text-slate-600 mt-1">Cost: ~$1-2 per 1000 assessments</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-900 mb-2">2. Deploy AI Function (3 minutes)</p>
                  <div className="space-y-2">
                    <div className="bg-slate-50 p-2 rounded font-mono text-xs flex items-center justify-between">
                      <span>npx supabase login</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCommand('npx supabase login')}
                        className="h-6 px-2"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="bg-slate-50 p-2 rounded font-mono text-xs flex items-center justify-between">
                      <span className="break-all">npx supabase link --project-ref {projectRef}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCommand(`npx supabase link --project-ref ${projectRef}`)}
                        className="h-6 px-2"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="bg-slate-50 p-2 rounded font-mono text-xs flex items-center justify-between">
                      <span className="break-all">npx supabase secrets set OPENAI_API_KEY=sk-your-key</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCommand('npx supabase secrets set OPENAI_API_KEY=sk-your-key')}
                        className="h-6 px-2"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="bg-slate-50 p-2 rounded font-mono text-xs flex items-center justify-between">
                      <span className="break-all">npx supabase functions deploy ai-assessment-interpretation</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyCommand('npx supabase functions deploy ai-assessment-interpretation')}
                        className="h-6 px-2"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <Button
                    size="sm"
                    onClick={checkAIStatus}
                    className="w-full"
                  >
                    Check AI Status Again
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-orange-600" />
                <p className="text-xs text-orange-700">
                  <strong>Note:</strong> Printouts will work without AI, but won't include clinical interpretations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISetupHelper;
