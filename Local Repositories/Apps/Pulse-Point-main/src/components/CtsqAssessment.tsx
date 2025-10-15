import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, X, BookOpen, Printer, Heart, Shield, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';

const CtsqAssessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, closePrintView } = useAssessmentPrint();

  const instructions = getInstructionsById('ctsq');

  const questions = [
    {
      id: 1,
      text: "Have you had nightmares or dreams about something scary that happened to you?",
      clientFriendly: "Do you have bad dreams about scary things that happened?",
      category: "Re-experiencing"
    },
    {
      id: 2,
      text: "When something reminds you of what happened, do you get very scared, sad, or upset?",
      clientFriendly: "Do you feel really scared or sad when something reminds you of what happened?",
      category: "Re-experiencing"
    },
    {
      id: 3,
      text: "Do you try not to think about what happened?",
      clientFriendly: "Do you try hard not to think about the scary thing?",
      category: "Avoidance"
    },
    {
      id: 4,
      text: "Do you stay away from places, people, or things that remind you of what happened?",
      clientFriendly: "Do you stay away from places or people that remind you of what happened?",
      category: "Avoidance"
    },
    {
      id: 5,
      text: "Do you feel alone even when you are with other people?",
      clientFriendly: "Do you feel alone even when other people are with you?",
      category: "Negative Mood"
    },
    {
      id: 6,
      text: "Do you have trouble feeling happy?",
      clientFriendly: "Is it hard to feel happy?",
      category: "Negative Mood"
    },
    {
      id: 7,
      text: "Do you feel like you have to be extra careful about staying safe?",
      clientFriendly: "Do you worry a lot about staying safe?",
      category: "Hypervigilance"
    },
    {
      id: 8,
      text: "Are you easily startled or jumpy?",
      clientFriendly: "Do you jump or get scared easily when you hear loud noises?",
      category: "Hypervigilance"
    },
    {
      id: 9,
      text: "Do you have trouble paying attention at school or when doing homework?",
      clientFriendly: "Is it hard to pay attention in school or when doing homework?",
      category: "Concentration"
    },
    {
      id: 10,
      text: "Do you have trouble falling asleep or staying asleep?",
      clientFriendly: "Do you have trouble going to sleep or staying asleep?",
      category: "Sleep Problems"
    }
  ];

  const [useClientFriendly, setUseClientFriendly] = useState(true);

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
    const positiveResponses = Object.values(answers).filter(answer => answer === true).length;
    const totalQuestions = Object.keys(answers).length;
    
    return {
      score: positiveResponses,
      totalQuestions,
      cutoffMet: positiveResponses >= 5, // 5+ indicates probable trauma symptoms
      sensitivity: 0.85,
      specificity: 0.75
    };
  };

  const getResultsInterpretation = () => {
    const results = calculateResults();
    
    if (results.score === 0) {
      return {
        result: 'No Trauma Symptoms Reported',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Child/adolescent reports no significant trauma symptoms. Continue supportive care and monitor for any emerging concerns.',
        riskLevel: 'low'
      };
    } else if (results.score < 3) {
      return {
        result: 'Minimal Trauma Symptoms',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        recommendation: 'Child/adolescent reports minimal trauma symptoms. Consider trauma-informed care approaches and continued monitoring.',
        riskLevel: 'low'
      };
    } else if (results.score < 5) {
      return {
        result: 'Moderate Trauma Symptoms',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Child/adolescent reports moderate trauma symptoms. Consider more detailed trauma assessment and trauma-informed interventions.',
        riskLevel: 'moderate'
      };
    } else {
      return {
        result: 'Significant Trauma Symptoms',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Child/adolescent reports significant trauma symptoms (cutoff met). Strongly recommend comprehensive trauma evaluation and specialized treatment for children.',
        riskLevel: 'high'
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
      'Child Trauma Screening Questionnaire (CTSQ)',
      questions,
      answers,
      {
        clientName: 'Client Name', // This would come from props or context
        score: results.score,
        maxScore: questions.length,
        cutoffMet: results.cutoffMet,
        result: interpretation.result,
        notes,
        interpretation: interpretation.recommendation,
        riskLevel: interpretation.riskLevel
      }
    );
    openPrintView(printData);
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Child-friendly grounding component
  const GroundingComponent = () => (
    <Card className="border-purple-200 bg-purple-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Star className="h-8 w-8 text-purple-600 mt-1" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-900">Take a Break - You're Doing Great!</h3>
            <p className="text-purple-800">
              These questions can be hard to answer. Remember that you are safe now, and you can take your time.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Let's Do Something Calming:</h4>
                <ul className="text-purple-800 space-y-1 text-sm">
                  <li>• Take three slow, deep breaths</li>
                  <li>• Look around and name 3 things you can see</li>
                  <li>• Think about your favorite safe place</li>
                  <li>• Remember: You are brave and strong</li>
                </ul>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">You Can:</h4>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• Continue when you're ready</li>
                  <li>• Ask for help from a trusted adult</li>
                  <li>• Stop if you need to</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowGrounding(false)} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                I'm Ready to Continue
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/assessments')}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                I Want to Stop
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
              Assessment Complete - Great Job!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6">
              <Heart className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <p className="text-lg text-purple-800 mb-2">You did an amazing job completing this assessment!</p>
              <p className="text-purple-700">Thank you for sharing your experiences with us.</p>
            </div>

            <div className={`p-6 rounded-lg border ${interpretation.borderColor} ${interpretation.bgColor}`}>
              <h3 className={`text-lg font-semibold ${interpretation.color} mb-4`}>
                Assessment Results
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Screening Summary:</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    Score: {results.score} of {questions.length}
                  </p>
                  <p className="text-sm text-slate-600 mb-2">
                    Cutoff (≥5): {results.cutoffMet ? 'Met' : 'Not met'}
                  </p>
                  <div className="text-xs text-slate-500 mt-2">
                    <p>Sensitivity: {results.sensitivity * 100}%</p>
                    <p>Specificity: {results.specificity * 100}%</p>
                  </div>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Important Note for Clinicians:</h4>
              <p className="text-sm text-blue-800">
                This is a screening tool for children and adolescents. Results should be interpreted within the context of 
                the child's developmental level, cultural background, and other clinical factors. Consider involving parents/guardians 
                in follow-up discussions as appropriate.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Clinical Notes:</h4>
              <Textarea
                placeholder="Add clinical observations, developmental considerations, family context, or follow-up plans..."
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
          className="flex items-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <Star className="h-4 w-4" />
          Take a Break
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseClientFriendly(!useClientFriendly)}
          className="flex items-center gap-2"
        >
          {useClientFriendly ? 'Clinical Version' : 'Child-Friendly Version'}
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">CTSQ Assessment</h1>
          <p className="text-slate-600">Child Trauma Screening Questionnaire</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Assessment Progress</span>
            <span className="text-sm text-slate-600">{currentQuestion + 1} of {questions.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm text-purple-700">
              You're doing great! {Math.round(progress)}% complete ⭐
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="border-2 border-purple-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-slate-900">
              Question {currentQuestion + 1}
            </CardTitle>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
              {questions[currentQuestion].category}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          {/* Question Text */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-700">
                {useClientFriendly ? 'Child-Friendly Version' : 'Clinical Version'}
              </h4>
            </div>
            <p className="text-lg text-slate-800 leading-relaxed">
              {useClientFriendly 
                ? questions[currentQuestion].clientFriendly 
                : questions[currentQuestion].text
              }
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
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
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

export default CtsqAssessment;