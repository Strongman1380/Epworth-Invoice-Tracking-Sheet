import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from './ui/use-toast';
import { assessmentStorage } from '../services/assessmentStorage';
import { clientStorage } from '../services/clientStorage';
import { supabase } from '@/integrations/supabase/client';
import MobileOptimizedAssessment from './MobileOptimizedAssessment';

interface AIGuidedAssessmentProps {
  assessmentType: 'PCL-5' | 'ACE' | 'TSQ';
}

const AIGuidedAssessment: React.FC<AIGuidedAssessmentProps> = ({ assessmentType }) => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClient = async () => {
      if (clientId) {
        const clientData = await clientStorage.getClientById(clientId);
        setClient(clientData);
      }
      setLoading(false);
    };

    loadClient();
  }, [clientId]);

  const handleAssessmentComplete = async (responses: Record<string, string>) => {
    if (!clientId || !client) {
      toast({
        title: "Error",
        description: "No client selected for this assessment.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate basic score
      const score = Object.values(responses).reduce((total, responseValue) => {
        return total + (parseInt(responseValue) || 0);
      }, 0);

      // Determine risk level
      const determineRiskLevel = (score: number): 'low' | 'moderate' | 'high' | 'severe' => {
        if (assessmentType === 'PCL-5') {
          if (score >= 50) return 'severe';
          if (score >= 38) return 'high';
          if (score >= 20) return 'moderate';
          return 'low';
        }
        // Default thresholds for other assessments
        if (score >= 75) return 'severe';
        if (score >= 50) return 'high';
        if (score >= 25) return 'moderate';
        return 'low';
      };

      const riskLevel = determineRiskLevel(score);

      const assessmentData = {
        clientId,
        assessmentType,
        responses,
        score,
        riskLevel
      };

      const savedAssessment = await assessmentStorage.saveAssessment(assessmentData);

      if (savedAssessment) {
        // Generate AI risk analysis
        try {
          const { data: aiAnalysis } = await supabase.functions.invoke('ai-risk-assessment', {
            body: {
              assessmentType,
              responses,
              rawScore: score
            }
          });

          if (aiAnalysis) {
            // Update assessment with AI insights
            await assessmentStorage.updateAssessment(savedAssessment.id, {
              notes: aiAnalysis.specialConsiderations || ''
            });
          }
        } catch (error) {
          console.error('AI analysis failed:', error);
          // Continue without AI analysis
        }

        toast({
          title: "Assessment Completed",
          description: `${assessmentType} assessment saved successfully. Risk level: ${riskLevel.toUpperCase()}`,
        });

        navigate(`/client/${clientId}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to save assessment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Client Not Found</h2>
          <p className="text-muted-foreground">Unable to load client information.</p>
        </div>
      </div>
    );
  }

  return (
    <MobileOptimizedAssessment 
      assessmentType={assessmentType}
      clientId={clientId}
    />
  );
};

export default AIGuidedAssessment;