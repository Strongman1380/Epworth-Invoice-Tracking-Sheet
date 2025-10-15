import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ui/use-toast';
import { assessmentStorage } from '../services/assessmentStorage';
import { clientStorage } from '../services/clientStorage';

interface Question {
  id: string;
  text: string;
  options: { value: string; label: string; score: number }[];
}

interface MobileAssessmentProps {
  assessmentType: 'PCL-5' | 'ACE' | 'TSQ';
  clientId?: string;
}

const MobileOptimizedAssessment: React.FC<MobileAssessmentProps> = ({ 
  assessmentType, 
  clientId 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sample questions for PCL-5 (Post-Traumatic Stress Disorder Checklist)
  const pcl5Questions: Question[] = [
    {
      id: 'q1',
      text: 'Repeated, disturbing, and unwanted memories of the stressful experience?',
      options: [
        { value: '0', label: 'Not at all', score: 0 },
        { value: '1', label: 'A little bit', score: 1 },
        { value: '2', label: 'Moderately', score: 2 },
        { value: '3', label: 'Quite a bit', score: 3 },
        { value: '4', label: 'Extremely', score: 4 }
      ]
    },
    {
      id: 'q2',
      text: 'Repeated, disturbing dreams of the stressful experience?',
      options: [
        { value: '0', label: 'Not at all', score: 0 },
        { value: '1', label: 'A little bit', score: 1 },
        { value: '2', label: 'Moderately', score: 2 },
        { value: '3', label: 'Quite a bit', score: 3 },
        { value: '4', label: 'Extremely', score: 4 }
      ]
    },
    {
      id: 'q3',
      text: 'Suddenly feeling or acting as if the stressful experience were actually happening again?',
      options: [
        { value: '0', label: 'Not at all', score: 0 },
        { value: '1', label: 'A little bit', score: 1 },
        { value: '2', label: 'Moderately', score: 2 },
        { value: '3', label: 'Quite a bit', score: 3 },
        { value: '4', label: 'Extremely', score: 4 }
      ]
    },
    {
      id: 'q4',
      text: 'Feeling very upset when something reminded you of the stressful experience?',
      options: [
        { value: '0', label: 'Not at all', score: 0 },
        { value: '1', label: 'A little bit', score: 1 },
        { value: '2', label: 'Moderately', score: 2 },
        { value: '3', label: 'Quite a bit', score: 3 },
        { value: '4', label: 'Extremely', score: 4 }
      ]
    },
    {
      id: 'q5',
      text: 'Having strong physical reactions when something reminded you of the stressful experience?',
      options: [
        { value: '0', label: 'Not at all', score: 0 },
        { value: '1', label: 'A little bit', score: 1 },
        { value: '2', label: 'Moderately', score: 2 },
        { value: '3', label: 'Quite a bit', score: 3 },
        { value: '4', label: 'Extremely', score: 4 }
      ]
    }
  ];

  useEffect(() => {
    // Set questions based on assessment type
    if (assessmentType === 'PCL-5') {
      setQuestions(pcl5Questions);
    }
    // Add more assessment types here

    // Check for landscape orientation
    const checkOrientation = () => {
      setIsLandscape(window.innerHeight < window.innerWidth && window.innerWidth < 1024);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [assessmentType]);

  const handleResponseChange = (value: string) => {
    setResponses(prev => ({
      ...prev,
      [questions[currentQuestion].id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    return Object.values(responses).reduce((total, responseValue) => {
      const question = questions.find(q => responses[q.id] === responseValue);
      const option = question?.options.find(opt => opt.value === responseValue);
      return total + (option?.score || 0);
    }, 0);
  };

  const determineRiskLevel = (score: number): 'low' | 'moderate' | 'high' | 'severe' => {
    // PCL-5 scoring thresholds
    if (score >= 50) return 'severe';
    if (score >= 38) return 'high';
    if (score >= 20) return 'moderate';
    return 'low';
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast({
        title: "Error",
        description: "No client selected for this assessment.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const score = calculateScore();
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
        toast({
          title: "Assessment Completed",
          description: `${assessmentType} assessment saved successfully. Risk level: ${riskLevel.toUpperCase()}`,
        });

        // Navigate to results or back to dashboard
        navigate('/progress-dashboard');
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

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentResponse = responses[questions[currentQuestion]?.id];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const canProceed = currentResponse !== undefined;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Assessment Not Available</h3>
            <p className="text-slate-600 mb-4">This assessment type is not yet configured.</p>
            <Button onClick={() => navigate('/assessments')} variant="outline">
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 ${isLandscape ? 'p-2' : 'p-4'}`}>
      {/* Mobile-optimized header */}
      <div className={`sticky top-0 bg-white/80 backdrop-blur-sm border-b border-white/20 ${isLandscape ? 'p-2' : 'p-4'} mb-4 rounded-lg`}>
        <div className="flex items-center justify-between mb-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/assessments')}
            className="touch-target"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="text-center">
            <h1 className={`font-bold text-slate-900 ${isLandscape ? 'text-lg' : 'text-xl'}`}>
              {assessmentType} Assessment
            </h1>
            <p className="text-sm text-slate-600">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>
        
        <Progress 
          value={progress} 
          className={`${isLandscape ? 'h-2' : 'h-3'} bg-white/50`}
        />
      </div>

      {/* Question Card */}
      <div className="max-w-2xl mx-auto">
        <Card className={`mb-6 shadow-lg border-0 ${isLandscape ? 'mx-2' : 'mx-4'}`}>
          <CardHeader className={isLandscape ? 'p-4 pb-2' : 'p-6 pb-4'}>
            <CardTitle className={`${isLandscape ? 'text-lg' : 'text-xl'} leading-relaxed text-slate-900`}>
              In the past month, how much were you bothered by:
            </CardTitle>
            <p className={`${isLandscape ? 'text-base' : 'text-lg'} text-slate-700 font-medium leading-relaxed mt-2`}>
              {questions[currentQuestion]?.text}
            </p>
          </CardHeader>
          <CardContent className={isLandscape ? 'p-4 pt-0' : 'p-6 pt-0'}>
            <RadioGroup 
              value={currentResponse || ''} 
              onValueChange={handleResponseChange}
              className="space-y-3"
            >
              {questions[currentQuestion]?.options.map((option) => (
                <div 
                  key={option.value} 
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all touch-target ${
                    currentResponse === option.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    className="touch-target"
                  />
                  <Label 
                    htmlFor={option.value} 
                    className={`flex-1 cursor-pointer ${isLandscape ? 'text-sm' : 'text-base'} font-medium`}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className={`flex gap-3 ${isLandscape ? 'mx-2' : 'mx-4'}`}>
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
            className="flex-1 touch-target h-12"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || loading}
              className="flex-1 touch-target h-12 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 touch-target h-12"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Mobile optimization indicator */}
        {isLandscape && (
          <div className="flex items-center justify-center mt-4 text-xs text-slate-500">
            <Smartphone className="h-3 w-3 mr-1" />
            Landscape mode detected - UI optimized
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOptimizedAssessment;