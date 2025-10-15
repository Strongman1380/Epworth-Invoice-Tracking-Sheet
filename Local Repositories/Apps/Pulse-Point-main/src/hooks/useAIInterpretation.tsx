import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AIInterpretation {
  scoreInterpretation: string;
  symptomPatterns: string[];
  clinicalSignificance: {
    level: 'minimal' | 'mild' | 'moderate' | 'severe';
    urgency: 'routine' | 'prompt' | 'urgent' | 'immediate';
    explanation: string;
  };
  strengthsAndResources: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  followUp: {
    timeline: string;
    reassessmentTools: string[];
    monitoringFocus: string[];
  };
  differentialConsiderations: string[];
  clinicalNotes: string;
  summary: string;
  assessmentInfo?: {
    name: string;
    purpose: string;
    scoringRange: string;
    cutoffScore: number | string;
    subscales: string[];
    interpretation: string;
  };
  generatedAt?: string;
  aiModel?: string;
}

export const useAIInterpretation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(null);

  const generateInterpretation = async (
    assessmentType: string,
    score: number,
    answers: Record<number | string, any>,
    questions: Array<{ id: number; text: string; clinical?: string; category?: string }>
  ): Promise<AIInterpretation | null> => {
    setLoading(true);
    setError(null);

    try {
      // Call the AI interpretation Supabase function
      const { data, error: functionError } = await supabase.functions.invoke(
        'ai-assessment-interpretation',
        {
          body: {
            assessmentType,
            score,
            answers,
            questions,
            responses: Object.values(answers)
          }
        }
      );

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(functionError.message || 'Failed to generate AI interpretation');
      }

      if (data?.error) {
        console.error('AI interpretation error:', data.error);
        // Return fallback interpretation if provided
        if (data.fallbackInterpretation) {
          setInterpretation(data.fallbackInterpretation);
          setLoading(false);
          return data.fallbackInterpretation;
        }
        throw new Error(data.error);
      }

      setInterpretation(data);
      setLoading(false);
      return data;
    } catch (err: any) {
      console.error('Error generating AI interpretation:', err);
      setError(err.message || 'Failed to generate interpretation');
      setLoading(false);
      
      // Return a basic fallback interpretation
      const fallback: AIInterpretation = {
        scoreInterpretation: `Score: ${score}. Please refer to standard clinical guidelines for detailed interpretation.`,
        symptomPatterns: ['AI interpretation unavailable at this time'],
        clinicalSignificance: {
          level: 'moderate',
          urgency: 'routine',
          explanation: 'Unable to generate AI analysis. Manual review recommended.'
        },
        strengthsAndResources: ['Client completed assessment'],
        recommendations: {
          immediate: ['Review responses manually', 'Consult clinical guidelines'],
          shortTerm: ['Schedule follow-up assessment'],
          longTerm: ['Continue monitoring symptoms']
        },
        followUp: {
          timeline: 'As clinically indicated',
          reassessmentTools: ['Re-administer same assessment in 2-4 weeks'],
          monitoringFocus: ['Overall symptom severity', 'Treatment response']
        },
        differentialConsiderations: ['Comprehensive clinical evaluation recommended'],
        clinicalNotes: 'AI interpretation could not be generated. Please use standard clinical judgment and assessment guidelines.',
        summary: 'AI interpretation unavailable. Please refer to clinical guidelines for this assessment type.'
      };
      
      setInterpretation(fallback);
      return fallback;
    }
  };

  const clearInterpretation = () => {
    setInterpretation(null);
    setError(null);
  };

  return {
    interpretation,
    loading,
    error,
    generateInterpretation,
    clearInterpretation
  };
};
