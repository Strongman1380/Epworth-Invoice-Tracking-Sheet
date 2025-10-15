import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Brain, FileText, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIInsightsProps {
  clientId: string;
  assessmentData?: {
    type: string;
    score: number;
    riskLevel: string;
    responses: Record<string, string>;
  };
}

interface AssessmentRecommendation {
  recommendedAssessment: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  timeframe: string;
}

interface RiskAnalysis {
  riskLevel: string;
  confidenceScore: number;
  keyIndicators: string[];
  protectiveFactors: string[];
  recommendations: string[];
  followUpTimeframe: string;
  specialConsiderations: string;
}

interface SimilarClient {
  clientId: string;
  name: string;
  similarityScore: number;
  commonFactors: string[];
  keyDifferences: string[];
  recommendedActions: string[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ clientId, assessmentData }) => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AssessmentRecommendation | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [similarClients, setSimilarClients] = useState<SimilarClient[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [structuredNote, setStructuredNote] = useState('');
  const [activeTab, setActiveTab] = useState<'recommendations' | 'risk' | 'similar' | 'notes'>('recommendations');
  const { toast } = useToast();

  useEffect(() => {
    if (clientId) {
      loadAssessmentRecommendations();
      loadSimilarClients();
    }
  }, [clientId]);

  useEffect(() => {
    if (assessmentData) {
      generateRiskAnalysis();
    }
  }, [assessmentData]);

  const loadAssessmentRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-recommendations', {
        body: { clientId }
      });

      if (error) throw error;
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load AI recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRiskAnalysis = async () => {
    if (!assessmentData) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-risk-assessment', {
        body: {
          assessmentType: assessmentData.type,
          responses: assessmentData.responses,
          rawScore: assessmentData.score
        }
      });

      if (error) throw error;
      setRiskAnalysis(data);
    } catch (error) {
      console.error('Error generating risk analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI risk analysis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarClients = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-client-matching', {
        body: { clientId, userId: user.user.id }
      });

      if (error) throw error;
      setSimilarClients(data.similarClients || []);
    } catch (error) {
      console.error('Error loading similar clients:', error);
      toast({
        title: "Error",
        description: "Failed to load similar clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateProgressNote = async () => {
    if (!rawNotes.trim()) {
      toast({
        title: "Error",
        description: "Please enter some notes to structure",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-progress-notes', {
        body: {
          clientId,
          rawNotes,
          assessmentData
        }
      });

      if (error) throw error;
      setStructuredNote(data.structuredNote);
    } catch (error) {
      console.error('Error generating progress note:', error);
      toast({
        title: "Error",
        description: "Failed to generate structured note",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'recommendations' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('recommendations')}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          Recommendations
        </Button>
        <Button
          variant={activeTab === 'risk' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('risk')}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Risk Analysis
        </Button>
        <Button
          variant={activeTab === 'similar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('similar')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Similar Cases
        </Button>
        <Button
          variant={activeTab === 'notes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('notes')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Note Assistant
        </Button>
      </div>

      {/* Assessment Recommendations */}
      {activeTab === 'recommendations' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Assessment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !recommendations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Analyzing assessment history...</span>
              </div>
            ) : recommendations ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Recommended: {recommendations.recommendedAssessment}</h3>
                  <Badge className={getPriorityColor(recommendations.priority)}>
                    {recommendations.priority.toUpperCase()} Priority
                  </Badge>
                </div>
                <p className="text-muted-foreground">{recommendations.reason}</p>
                <div className="text-sm">
                  <strong>Suggested Timeframe:</strong> {recommendations.timeframe}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No recommendations available. Complete some assessments first.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis */}
      {activeTab === 'risk' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              AI Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessmentData && riskAnalysis ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Risk Level: {riskAnalysis.riskLevel.toUpperCase()}</h3>
                  <Badge variant="outline">
                    Confidence: {Math.round(riskAnalysis.confidenceScore * 100)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Key Indicators</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {riskAnalysis.keyIndicators.map((indicator, index) => (
                        <li key={index}>{indicator}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Protective Factors</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {riskAnalysis.protectiveFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {riskAnalysis.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm"><strong>Follow-up:</strong> {riskAnalysis.followUpTimeframe}</p>
                  {riskAnalysis.specialConsiderations && (
                    <p className="text-sm mt-2"><strong>Special Considerations:</strong> {riskAnalysis.specialConsiderations}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Complete an assessment to see AI risk analysis.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Similar Clients */}
      {activeTab === 'similar' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Similar Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {similarClients.length > 0 ? (
              <div className="space-y-4">
                {similarClients.map((client) => (
                  <div key={client.clientId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{client.name}</h3>
                      <Badge variant="outline">
                        {Math.round(client.similarityScore * 100)}% Similar
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Common Factors:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {client.commonFactors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <strong>Key Differences:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {client.keyDifferences.map((diff, index) => (
                            <li key={index}>{diff}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-3">
                      <strong className="text-sm">Recommended Actions:</strong>
                      <ul className="list-disc list-inside text-sm mt-1">
                        {client.recommendedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No similar cases found. Add more client assessments to enable pattern matching.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Note Assistant */}
      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progress Note Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Raw Notes (Enter your observations, client statements, etc.)
              </label>
              <Textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Enter your raw clinical notes here..."
                className="min-h-[120px]"
              />
            </div>

            <Button 
              onClick={generateProgressNote} 
              disabled={loading || !rawNotes.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Structured Note...
                </>
              ) : (
                'Generate Structured Note'
              )}
            </Button>

            {structuredNote && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Structured Progress Note
                </label>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                  {structuredNote}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsights;