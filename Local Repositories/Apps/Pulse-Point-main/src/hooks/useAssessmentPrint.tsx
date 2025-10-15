import { useState } from 'react';
import { AssessmentData } from '../components/AssessmentPrintView';
import { useAIInterpretation, AIInterpretation } from './useAIInterpretation';

export const useAssessmentPrint = () => {
  const [printData, setPrintData] = useState<AssessmentData | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const { generateInterpretation, loading: aiLoading } = useAIInterpretation();

  const generatePrintData = (
    assessmentType: string,
    questions: Array<{ id: number; text: string; clinical?: string; clientFriendly?: string; category?: string }>,
    answers: Record<number, any>,
    options?: {
      clientName?: string;
      clientId?: string;
      score?: number;
      maxScore?: number;
      result?: string;
      interpretation?: string;
      riskLevel?: string;
      notes?: string;
    }
  ): AssessmentData => {
    return {
      id: `${assessmentType}-${Date.now()}`,
      assessmentType,
      clientName: options?.clientName || 'Client',
      clientId: options?.clientId,
      completedDate: new Date().toISOString(),
      answers,
      score: options?.score,
      maxScore: options?.maxScore,
      result: options?.result,
      interpretation: options?.interpretation,
      riskLevel: options?.riskLevel,
      notes: options?.notes,
      questions: questions.map(q => ({
        id: q.id,
        text: q.clinical || q.text,
        category: q.category,
        answer: answers[q.id]
      }))
    };
  };

  const openPrintView = (data: AssessmentData) => {
    setPrintData(data);
    setShowPrintView(true);
  };

  const openPrintViewWithAI = async (
    assessmentType: string,
    questions: Array<{ id: number; text: string; clinical?: string; clientFriendly?: string; category?: string }>,
    answers: Record<number, any>,
    options?: {
      clientName?: string;
      clientId?: string;
      score?: number;
      maxScore?: number;
      result?: string;
      interpretation?: string;
      riskLevel?: string;
      notes?: string;
    }
  ) => {
    // Generate base print data
    const basePrintData = generatePrintData(assessmentType, questions, answers, options);
    
    // Check if AI is enabled (can be disabled via env variable for testing)
    const aiEnabled = import.meta.env.VITE_ENABLE_AI_INTERPRETATION !== 'false';
    
    // If we have a score and questions, and AI is enabled, generate AI interpretation
    if (aiEnabled && options?.score !== undefined && questions.length > 0) {
      try {
        const aiInterpretation = await generateInterpretation(
          assessmentType,
          options.score,
          answers,
          questions
        );
        
        // Add AI interpretation to print data
        const enhancedPrintData = {
          ...basePrintData,
          aiInterpretation
        };
        
        setPrintData(enhancedPrintData);
        setShowPrintView(true);
      } catch (error) {
        console.error('AI interpretation failed, showing standard print:', error);
        // If AI fails, still show standard print
        openPrintView(basePrintData);
      }
    } else {
      // No AI interpretation (disabled or not enough data), just show standard print
      openPrintView(basePrintData);
    }
  };

  const closePrintView = () => {
    setShowPrintView(false);
    setPrintData(null);
  };

  return {
    printData,
    showPrintView,
    aiLoading,
    generatePrintData,
    openPrintView,
    openPrintViewWithAI,
    closePrintView
  };
};