import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, X, BookOpen, Printer, Heart, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';

const BtqAssessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, closePrintView } = useAssessmentPrint();

  const instructions = getInstructionsById('btq');

  const questions = [
    {
      id: 1,
      text: "Have you ever been in a motor vehicle accident in which someone was injured or killed, or in which you thought that you or another person might be seriously injured or killed?",
      category: "Motor Vehicle Accident"
    },
    {
      id: 2,
      text: "Have you ever been in any other kind of accident in which you were injured or in which you thought you might be seriously injured? (examples: train accident, building collapse, boat accident, plane crash)",
      category: "Other Accident"
    },
    {
      id: 3,
      text: "Have you ever experienced a natural disaster such as a tornado, hurricane, flood, or major earthquake that resulted in significant loss of your personal property, or in which you felt your life was in danger?",
      category: "Natural Disaster"
    },
    {
      id: 4,
      text: "Have you ever been in a situation where you thought you might be killed or seriously injured? (examples: lost at sea, lost in the wilderness, caught in a fire)",
      category: "Life-threatening Situation"
    },
    {
      id: 5,
      text: "Have you ever witnessed someone being killed, seriously injured, or assaulted?",
      category: "Witnessed Trauma"
    },
    {
      id: 6,
      text: "Have you ever been robbed or been present during a robbery—whether or not you were injured?",
      category: "Crime Victim"
    },
    {
      id: 7,
      text: "Have you ever been hit, slapped, kicked, or otherwise physically hurt by someone? (do not include ordinary fights between children)",
      category: "Physical Assault"
    },
    {
      id: 8,
      text: "Have you ever been forced to have sex against your will?",
      category: "Sexual Assault"
    },
    {
      id: 9,
      text: "Have you ever been touched inappropriately or forced to touch someone inappropriately against your will, but did not have sex?",
      category: "Sexual Contact"
    },
    {
      id: 10,
      text: "Have you ever experienced any other extraordinarily stressful situation that you haven't mentioned?",
      category: "Other Trauma"
    }
  ];

  const handleAnswer = (answer: boolean) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeAssessment();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const skipQuestion = () => {
    nextQuestion();
  };

  const calculateResults = () => {
    const exposureCount = Object.values(answers).filter(answer => answer === true).length;
    const totalQuestions = Object.keys(answers).length;
    
    return {
      exposureCount,
      totalQuestions,
      hasExposure: exposureCount > 0,
      exposureTypes: questions.filter((_, index) => answers[index] === true).map(q => q.category)
    };
  };

  const getResultsInterpretation = () => {
    const results = calculateResults();
    
    if (results.exposureCount === 0) {
      return {
        result: 'No Trauma Exposure Reported',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Client reported no lifetime trauma exposure. Continue supportive care and monitor for any emerging concerns.',
        riskLevel: 'low'
      };
    } else if (results.exposureCount <= 2) {
      return {
        result: 'Limited Trauma Exposure',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Client reports limited trauma exposure. Consider trauma-informed care approaches and monitor for trauma-related symptoms.',
        riskLevel: 'moderate'
      };
    } else if (results.exposureCount <= 4) {
      return {
        result: 'Moderate Trauma Exposure',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        recommendation: 'Client reports moderate trauma exposure across multiple categories. Consider comprehensive trauma screening (PCL-5) and trauma-informed interventions.',
        riskLevel: 'high'
      };
    } else {
      return {
        result: 'Extensive Trauma Exposure',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Client reports extensive lifetime trauma exposure. Strongly recommend comprehensive PTSD assessment (CAPS-5 or PCL-5) and specialized trauma treatment.',
        riskLevel: 'very-high'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const handlePrintAssessment = () => {
    const results = calculateResults();
    const interpretation = getResultsInterpretation();
    
    const printData = generatePrintData(
      'Brief Trauma Questionnaire (BTQ)',
      questions,
      answers,
      {
        clientName: 'Client Name', // This would come from props or context
        exposureCount: results.exposureCount,
        totalQuestions: results.totalQuestions,
        result: interpretation.result,
        notes,
        interpretation: interpretation.recommendation,
        riskLevel: interpretation.riskLevel,
        exposureTypes: results.exposureTypes
      }
    );
    openPrintView(printData);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Grounding/Take a Break component
  const GroundingComponent = () => (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Shield className="h-8 w-8 text-blue-600 mt-1" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-900">Take a Moment to Ground Yourself</h3>
            <p className="text-blue-800">
              These questions can bring up difficult memories. Remember that you are safe now, and you can take your time.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">5-4-3-2-1 Grounding Technique:</h4>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Notice 5 things you can see</li>
                  <li>• Notice 4 things you can touch</li>
                  <li>• Notice 3 things you can hear</li>
                  <li>• Notice 2 things you can smell</li>
                  <li>• Notice 1 thing you can taste</li>
                </ul>
              </div>
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Deep Breathing:</h4>
                <p className="text-blue-800 text-sm">Take slow, deep breaths. Breathe in for 4 counts, hold for 4, breathe out for 4.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowGrounding(false)} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue Assessment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/assessments')}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Exit Safely
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show grounding component if activated
  if (showGrounding) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/assessments')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>
        <GroundingComponent />
      </div>
    );
  }

  // Show instructions first
  if (showInstructions && instructions) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6 max-w-4xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/assessments')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Skip to Assessment
          </Button>
        </div>
        <AssessmentInstructionsComponent 
          instructions={instructions}
          onProceed={() => setShowInstructions(false)}
        />
      </div>
    );
  }

  // Show completion screen
  if (isComplete) {
    const results = calculateResults();
    const interpretation = getResultsInterpretation();

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/assessments')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>

        <Card className={`${interpretation.bgColor} ${interpretation.borderColor} border-2`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Check className="h-6 w-6 text-green-600" />
              Assessment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6">
              <Heart className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <p className="text-lg text-blue-800 mb-2">Thank you for your strength in completing this assessment.</p>
              <p className="text-blue-700">Your responses help us better understand your experiences.</p>
            </div>

            <div className={`p-6 rounded-lg border ${interpretation.borderColor} ${interpretation.bgColor}`}>
              <h3 className={`text-lg font-semibold ${interpretation.color} mb-4`}>
                Assessment Results
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Trauma Exposure Summary:</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {results.exposureCount} of {questions.length} trauma categories reported
                  </p>
                  {results.exposureTypes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Exposure Types:</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {results.exposureTypes.map((type, index) => (
                          <li key={index}>• {type}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Clinical Interpretation:</h4>
                  <p className={`text-sm ${interpretation.color} font-medium mb-2`}>
                    {interpretation.result}
                  </p>
                  <p className="text-sm text-slate-600">
                    {interpretation.recommendation}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Clinical Notes:</h4>
              <Textarea
                placeholder="Add clinical observations, follow-up plans, or additional context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button onClick={handlePrintAssessment} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Generate Report
              </Button>
              <Button variant="outline" onClick={() => navigate('/assessments')}>
                Return to Library
              </Button>
            </div>
          </CardContent>
        </Card>

        {showPrintView && printData && (
          <AssessmentPrintView 
            data={printData} 
            onClose={closePrintView}
          />
        )}
      </div>
    );
  }

  // Main assessment interface
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/assessments')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstructions(true)}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          View Instructions
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowGrounding(true)}
          className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Shield className="h-4 w-4" />
          Take a Break
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">BTQ Assessment</h1>
          <p className="text-slate-600">Brief Trauma Questionnaire - Lifetime Exposure</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Assessment Progress</span>
            <span className="text-sm text-slate-600">{currentQuestion + 1} of {questions.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm text-blue-700">You're doing great - {Math.round(progress)}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="border-2 border-blue-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-slate-900">
              Question {currentQuestion + 1}
            </CardTitle>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {questions[currentQuestion].category}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          {/* Question Text */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <p className="text-lg text-slate-800 leading-relaxed">
              {questions[currentQuestion].text}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Please select your response:</h4>
            <div className="grid gap-3">
              <Button
                variant={answers[currentQuestion] === true ? "default" : "outline"}
                size="lg"
                onClick={() => handleAnswer(true)}
                className="w-full justify-start text-left p-6 h-auto border-2 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQuestion] === true 
                      ? 'bg-primary border-primary' 
                      : 'border-slate-300'
                  }`}>
                    {answers[currentQuestion] === true && <Check className="h-2 w-2 text-white" />}
                  </div>
                  <span className="text-base">Yes</span>
                </div>
              </Button>
              <Button
                variant={answers[currentQuestion] === false ? "default" : "outline"}
                size="lg"
                onClick={() => handleAnswer(false)}
                className="w-full justify-start text-left p-6 h-auto border-2 transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    answers[currentQuestion] === false 
                      ? 'bg-primary border-primary' 
                      : 'border-slate-300'
                  }`}>
                    {answers[currentQuestion] === false && <Check className="h-2 w-2 text-white" />}
                  </div>
                  <span className="text-base">No</span>
                </div>
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={skipQuestion}
                className="text-slate-500 hover:text-slate-700"
              >
                Skip
              </Button>
              <Button
                onClick={nextQuestion}
                disabled={answers[currentQuestion] === undefined}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
                {currentQuestion < questions.length - 1 && <ArrowLeft className="h-4 w-4 rotate-180" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BtqAssessment;