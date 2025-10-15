import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, BookOpen, Printer, Heart, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';

const Lec5Assessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [worstEvent, setWorstEvent] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, closePrintView } = useAssessmentPrint();

  const instructions = getInstructionsById('lec-5');

  const questions = [
    {
      id: 1,
      text: "Natural disaster (for example, flood, hurricane, tornado, earthquake)"
    },
    {
      id: 2,
      text: "Fire or explosion"
    },
    {
      id: 3,
      text: "Transportation accident (for example, car accident, boat accident, train wreck, plane crash)"
    },
    {
      id: 4,
      text: "Serious accident at work, home, or during recreational activity"
    },
    {
      id: 5,
      text: "Exposure to toxic substance (for example, dangerous chemicals, radiation)"
    },
    {
      id: 6,
      text: "Physical assault (for example, being attacked, hit, slapped, kicked, beaten up)"
    },
    {
      id: 7,
      text: "Assault with a weapon (for example, being shot, stabbed, threatened with a knife, gun, bomb)"
    },
    {
      id: 8,
      text: "Sexual assault (rape, attempted rape, made to perform any type of sexual act through force or threat of harm)"
    },
    {
      id: 9,
      text: "Other unwanted or uncomfortable sexual experience"
    },
    {
      id: 10,
      text: "Combat or exposure to a war-zone (in the military or as a civilian)"
    },
    {
      id: 11,
      text: "Captivity (for example, being kidnapped, abducted, held hostage, prisoner of war)"
    },
    {
      id: 12,
      text: "Life-threatening illness or injury"
    },
    {
      id: 13,
      text: "Severe human suffering"
    },
    {
      id: 14,
      text: "Sudden violent death (for example, homicide, suicide)"
    },
    {
      id: 15,
      text: "Sudden accidental death"
    },
    {
      id: 16,
      text: "Serious injury, harm, or death you caused to someone else"
    },
    {
      id: 17,
      text: "Any other very stressful event or experience"
    }
  ];

  const responseOptions = [
    { value: 'happened', label: 'Happened to me', shortLabel: 'Happened to me' },
    { value: 'witnessed', label: 'Witnessed it', shortLabel: 'Witnessed it' },
    { value: 'learned', label: 'Learned about it', shortLabel: 'Learned about it' },
    { value: 'job', label: 'Part of my job', shortLabel: 'Part of job' },
    { value: 'none', label: "Doesn't apply", shortLabel: "Doesn't apply" }
  ];

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentQuestion === questions.length - 1) {
      // Move to worst event selection
      setCurrentQuestion(questions.length);
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
    setAnswers({ ...answers, [currentQuestion]: 'none' });
    nextQuestion();
  };

  const calculateResults = () => {
    const exposureTypes = Object.entries(answers).reduce((acc, [index, response]) => {
      if (response !== 'none') {
        const questionIndex = parseInt(index);
        if (questionIndex < questions.length) {
          acc[response] = (acc[response] || 0) + 1;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const totalExposures = Object.values(exposureTypes).reduce((sum, count) => sum + count, 0);
    const criterionAEvents = ['happened', 'witnessed'].reduce((sum, type) => sum + (exposureTypes[type] || 0), 0);
    
    return {
      exposureTypes,
      totalExposures,
      criterionAEvents,
      hasDirectExposure: exposureTypes.happened > 0,
      hasWitnessedExposure: exposureTypes.witnessed > 0,
      worstEventIdentified: worstEvent !== null
    };
  };

  const getResultsInterpretation = () => {
    const results = calculateResults();
    
    if (results.totalExposures === 0) {
      return {
        result: 'No Potentially Traumatic Events Reported',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Client reported no potentially traumatic life events. Continue supportive care and monitor for any emerging concerns.',
        riskLevel: 'low'
      };
    } else if (results.criterionAEvents === 0) {
      return {
        result: 'Indirect Trauma Exposure Only',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        recommendation: 'Client reports trauma exposure through learning about events or job-related exposure only. Consider impact of indirect exposure and provide supportive care.',
        riskLevel: 'low'
      };
    } else if (results.criterionAEvents <= 2) {
      return {
        result: 'Limited Direct Trauma Exposure',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Client reports limited direct trauma exposure. Consider comprehensive PTSD screening (PCL-5) and trauma-informed care approaches.',
        riskLevel: 'moderate'
      };
    } else {
      return {
        result: 'Multiple Direct Trauma Exposures',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Client reports multiple direct trauma exposures. Strongly recommend comprehensive PTSD assessment (CAPS-5 or PCL-5) and specialized trauma treatment.',
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
      'Life Events Checklist for DSM-5 (LEC-5)',
      questions,
      answers,
      {
        clientName: 'Client Name', // This would come from props or context
        totalExposures: results.totalExposures,
        criterionAEvents: results.criterionAEvents,
        worstEvent: worstEvent !== null ? questions[worstEvent].text : 'Not identified',
        result: interpretation.result,
        notes,
        interpretation: interpretation.recommendation,
        riskLevel: interpretation.riskLevel,
        exposureBreakdown: results.exposureTypes
      }
    );
    openPrintView(printData);
  };

  const progress = currentQuestion <= questions.length - 1 
    ? ((currentQuestion + 1) / (questions.length + 1)) * 100
    : ((currentQuestion + 1) / (questions.length + 1)) * 100;

  // Grounding/Take a Break component
  const GroundingComponent = () => (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Shield className="h-8 w-8 text-blue-600 mt-1" />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-900">Take a Moment to Ground Yourself</h3>
            <p className="text-blue-800">
              Reviewing life events can bring up difficult memories. Remember that you are safe now, and you have control over how you proceed.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Grounding Techniques:</h4>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• Focus on your breathing - slow and steady</li>
                  <li>• Feel your feet on the ground</li>
                  <li>• Notice the temperature of the air on your skin</li>
                  <li>• Remind yourself: "I am safe right now"</li>
                </ul>
              </div>
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Remember:</h4>
                <p className="text-blue-800 text-sm">This checklist helps identify experiences for potential further assessment. You don't need to provide details about any events.</p>
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
              <p className="text-lg text-blue-800 mb-2">Thank you for completing this life events checklist.</p>
              <p className="text-blue-700">This information helps us understand your experiences and provide appropriate care.</p>
            </div>

            <div className={`p-6 rounded-lg border ${interpretation.borderColor} ${interpretation.bgColor}`}>
              <h3 className={`text-lg font-semibold ${interpretation.color} mb-4`}>
                Assessment Results
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Exposure Summary:</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-600">
                      Total exposures: {results.totalExposures}
                    </p>
                    <p className="text-slate-600">
                      DSM-5 Criterion A events: {results.criterionAEvents}
                    </p>
                    {results.worstEventIdentified && worstEvent !== null && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-800">Worst Event Identified:</p>
                        <p className="text-sm text-yellow-700">{questions[worstEvent].text}</p>
                      </div>
                    )}
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
              
              {Object.keys(results.exposureTypes).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-slate-900 mb-2">Exposure Breakdown:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(results.exposureTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-slate-600 capitalize">{type.replace('_', ' ')}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Next Steps:</h4>
                  <p className="text-sm text-blue-800">
                    The LEC-5 identifies potentially traumatic events and can be used to inform further PTSD assessment. 
                    If Criterion A events were endorsed, consider administering the PCL-5 or CAPS-5 for the identified worst event.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Clinical Notes:</h4>
              <Textarea
                placeholder="Add clinical observations, context about identified events, follow-up plans, or additional assessment recommendations..."
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

  // Worst event selection screen
  if (currentQuestion === questions.length) {
    const endorsedEvents = Object.entries(answers)
      .filter(([_, response]) => response === 'happened' || response === 'witnessed')
      .map(([index, _]) => parseInt(index));

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={previousQuestion}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Identify Worst Event</h1>
            <p className="text-slate-600">Select the event that bothers you the most</p>
          </div>
        </div>

        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-yellow-800">
              <AlertTriangle className="h-6 w-6" />
              Worst Event Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {endorsedEvents.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-slate-600 mb-4">
                  No events were marked as "happened to me" or "witnessed" - moving to completion.
                </p>
                <Button onClick={completeAssessment}>
                  Complete Assessment
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 mb-4">
                    Please select the event that bothers you the MOST. This will be used for any future PTSD assessments.
                  </p>
                  <p className="text-sm text-yellow-700">
                    If no single event stands out, select the one that had the most impact on you or that you think about most often.
                  </p>
                </div>

                <div className="space-y-3">
                  {endorsedEvents.map((eventIndex) => (
                    <Button
                      key={eventIndex}
                      variant={worstEvent === eventIndex ? "default" : "outline"}
                      size="lg"
                      onClick={() => setWorstEvent(eventIndex)}
                      className="w-full justify-start text-left p-6 h-auto border-2 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                          worstEvent === eventIndex 
                            ? 'bg-primary border-primary' 
                            : 'border-slate-300'
                        }`}>
                          {worstEvent === eventIndex && <Check className="h-2 w-2 text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 mb-1">
                            Event {eventIndex + 1}:
                          </p>
                          <p className="text-sm text-slate-700">
                            {questions[eventIndex].text}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Exposure: {responseOptions.find(opt => opt.value === answers[eventIndex])?.label}
                          </p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="bg-white p-4 rounded-lg border border-yellow-200">
                  <Button
                    variant="ghost"
                    onClick={() => setWorstEvent(-1)}
                    className="w-full text-slate-600 hover:text-slate-800"
                  >
                    I prefer not to select a specific event
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={completeAssessment}
                    disabled={worstEvent === null}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Complete Assessment
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">LEC-5 Assessment</h1>
          <p className="text-slate-600">Life Events Checklist for DSM-5</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Assessment Progress</span>
            <span className="text-sm text-slate-600">{currentQuestion + 1} of {questions.length + 1} steps</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm text-blue-700">Reviewing life events - {Math.round(progress)}% complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="border-2 border-blue-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-xl text-slate-900">
            Event {currentQuestion + 1} of {questions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          {/* Event Description */}
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <p className="text-lg text-slate-800 leading-relaxed">
              {questions[currentQuestion].text}
            </p>
          </div>

          {/* Response Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">How does this apply to you?</h4>
            <div className="grid gap-3">
              {responseOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={answers[currentQuestion] === option.value ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleAnswer(option.value)}
                  className="w-full justify-start text-left p-6 h-auto border-2 transition-all hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestion] === option.value 
                        ? 'bg-primary border-primary' 
                        : 'border-slate-300'
                    }`}>
                      {answers[currentQuestion] === option.value && <Check className="h-2 w-2 text-white" />}
                    </div>
                    <span className="text-base">{option.label}</span>
                  </div>
                </Button>
              ))}
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
                {currentQuestion === questions.length - 1 ? 'Next: Select Worst Event' : 'Next'}
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lec5Assessment;