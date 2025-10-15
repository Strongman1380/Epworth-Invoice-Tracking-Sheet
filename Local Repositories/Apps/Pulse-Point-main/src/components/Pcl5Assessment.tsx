
import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, BookOpen, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';
import AssessmentActions from './AssessmentActions';

const Pcl5Assessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, closePrintView } = useAssessmentPrint();

  const instructions = getInstructionsById('pcl-5');

  // Complete PCL-5 Questions (20 items)
  const questions = [
    { id: 1, text: "Repeated, disturbing, and unwanted memories of the stressful experience?", cluster: "Intrusion" },
    { id: 2, text: "Repeated, disturbing dreams of the stressful experience?", cluster: "Intrusion" },
    { id: 3, text: "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", cluster: "Intrusion" },
    { id: 4, text: "Feeling very upset when something reminded you of the stressful experience?", cluster: "Intrusion" },
    { id: 5, text: "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", cluster: "Intrusion" },
    { id: 6, text: "Avoiding memories, thoughts, or feelings related to the stressful experience?", cluster: "Avoidance" },
    { id: 7, text: "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", cluster: "Avoidance" },
    { id: 8, text: "Trouble remembering important parts of the stressful experience?", cluster: "Negative Cognition" },
    { id: 9, text: "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", cluster: "Negative Cognition" },
    { id: 10, text: "Blaming yourself or someone else for the stressful experience or what happened after it?", cluster: "Negative Cognition" },
    { id: 11, text: "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", cluster: "Negative Cognition" },
    { id: 12, text: "Loss of interest in activities that you used to enjoy?", cluster: "Negative Cognition" },
    { id: 13, text: "Feeling distant or cut off from other people?", cluster: "Negative Cognition" },
    { id: 14, text: "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", cluster: "Negative Cognition" },
    { id: 15, text: "Irritable behavior, angry outbursts, or acting aggressively?", cluster: "Arousal" },
    { id: 16, text: "Taking too many risks or doing things that could cause you harm?", cluster: "Arousal" },
    { id: 17, text: "Being 'superalert' or watchful or on guard?", cluster: "Arousal" },
    { id: 18, text: "Feeling jumpy or easily startled?", cluster: "Arousal" },
    { id: 19, text: "Having difficulty concentrating?", cluster: "Arousal" },
    { id: 20, text: "Trouble falling or staying asleep?", cluster: "Arousal" }
  ];

  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'A little bit' },
    { value: 2, label: 'Moderately' },
    { value: 3, label: 'Quite a bit' },
    { value: 4, label: 'Extremely' }
  ];

  const handleAnswer = (value: number) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const skipQuestion = () => {
    setAnswers({ ...answers, [currentQuestion]: -1 }); // -1 indicates skipped
    nextQuestion();
  };

  const calculateScore = () => {
    return Object.values(answers).filter(val => val >= 0).reduce((sum, val) => sum + val, 0);
  };

  const calculateClusterScores = () => {
    const clusters = {
      intrusion: [0, 1, 2, 3, 4],
      avoidance: [5, 6],
      negativeCognition: [7, 8, 9, 10, 11, 12, 13],
      arousal: [14, 15, 16, 17, 18, 19]
    };

    return {
      intrusion: clusters.intrusion.reduce((sum, i) => sum + (answers[i] || 0), 0),
      avoidance: clusters.avoidance.reduce((sum, i) => sum + (answers[i] || 0), 0),
      negativeCognition: clusters.negativeCognition.reduce((sum, i) => sum + (answers[i] || 0), 0),
      arousal: clusters.arousal.reduce((sum, i) => sum + (answers[i] || 0), 0)
    };
  };

  const getScoreInterpretation = (score: number) => {
    if (score < 31) {
      return {
        result: 'Below Cutoff',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Score is below the clinical cutoff for PTSD. Continue monitoring and provide appropriate support.'
      };
    } else if (score >= 31 && score <= 44) {
      return {
        result: 'Moderate Symptoms',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Score suggests moderate PTSD symptoms. Consider trauma-focused interventions and comprehensive assessment.'
      };
    } else if (score >= 45 && score <= 59) {
      return {
        result: 'Severe Symptoms',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        recommendation: 'Score indicates severe PTSD symptoms. Strongly recommend evidence-based trauma treatment such as CPT or PE.'
      };
    } else {
      return {
        result: 'Very Severe Symptoms',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Score indicates very severe PTSD symptoms. Immediate referral to specialized trauma treatment is strongly recommended. Consider safety assessment.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const handlePrintAssessment = () => {
    const score = calculateScore();
    const interpretation = getScoreInterpretation(score);
    const clusterScores = calculateClusterScores();
    
    const enhancedNotes = `${notes}\n\nCluster Scores:\n- Intrusion: ${clusterScores.intrusion}/20\n- Avoidance: ${clusterScores.avoidance}/8\n- Negative Cognition: ${clusterScores.negativeCognition}/28\n- Arousal: ${clusterScores.arousal}/24`;
    
    const printData = generatePrintData(
      'PCL-5 (PTSD Checklist for DSM-5)',
      questions,
      answers,
      {
        clientName: 'Client Name',
        score,
        maxScore: 80,
        result: interpretation.result,
        notes: enhancedNotes,
        interpretation: interpretation.recommendation,
        riskLevel: score >= 45 ? 'high' : score >= 31 ? 'moderate' : 'low'
      }
    );
    openPrintView(printData);
  };

  const handlePrintPaperForm = () => {
    // Create printable paper form with current progress
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the assessment form.');
      return;
    }

    // Generate current assessment state for paper form
    const currentAnswers = Object.keys(answers).reduce((acc, questionIndex) => {
      const idx = parseInt(questionIndex);
      const question = questions[idx];
      if (question && answers[idx] !== undefined) {
        acc.push({
          questionNumber: idx + 1,
          question: question.text,
          answer: answers[idx] === -1 ? 'SKIPPED' : `${answers[idx]} (${['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'][answers[idx]]})`
        });
      }
      return acc;
    }, [] as any[]);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PCL-5 Assessment - Paper Form</title>
          <style>
            @media print { body { margin: 0; } .no-print { display: none; } }
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .question { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; page-break-inside: avoid; }
            .answered { background-color: #f0f9ff; border-color: #0369a1; }
            .answer { margin-top: 5px; padding: 5px; background-color: #e0f2fe; border-radius: 3px; }
            .remaining { background-color: #fef7cd; }
            .scale { font-size: 12px; margin: 10px 0; padding: 10px; background-color: #f9fafb; }
            .no-print { text-align: center; margin: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PCL-5 Assessment - Paper Form</h1>
            <p>PTSD Checklist for DSM-5</p>
            <p>Progress: ${currentQuestion + 1} of ${questions.length} questions completed</p>
            <p>Date: ${new Date().toLocaleDateString()} | Client: _________________________</p>
          </div>

          <div style="margin-bottom: 20px; padding: 15px; background-color: #f9fafb; border: 1px solid #d1d5db;">
            <h3>Instructions:</h3>
            <p>Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then circle one of the numbers to indicate how much you have been bothered by that problem in the past month.</p>
            
            <div class="scale">
              <strong>Response Scale:</strong><br>
              0 = Not at all | 1 = A little bit | 2 = Moderately | 3 = Quite a bit | 4 = Extremely
            </div>
          </div>

          ${questions.map((question, index) => {
            const hasAnswer = answers[index] !== undefined;
            const isCurrentQuestion = index === currentQuestion;
            return `
              <div class="question ${hasAnswer ? 'answered' : ''} ${isCurrentQuestion && !hasAnswer ? 'remaining' : ''}">
                <strong>Question ${index + 1}:</strong> ${question.text}
                
                ${hasAnswer ? `
                  <div class="answer">
                    <strong>Answer:</strong> ${answers[index] === -1 ? 'SKIPPED' : `${answers[index]} (${['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'][answers[index]]})`}
                  </div>
                ` : `
                  <div style="margin-top: 10px;">
                    <span style="margin-right: 20px;">0 ☐</span>
                    <span style="margin-right: 20px;">1 ☐</span>
                    <span style="margin-right: 20px;">2 ☐</span>
                    <span style="margin-right: 20px;">3 ☐</span>
                    <span style="margin-right: 20px;">4 ☐</span>
                  </div>
                `}
              </div>
            `;
          }).join('')}

          <div style="margin-top: 30px; padding: 15px; border: 2px solid #000;">
            <h3>Scoring Area (For Clinician Use)</h3>
            <p>Total Score: _______ out of 80</p>
            <p>Cluster B (Re-experiencing 1-5): _______</p>
            <p>Cluster C (Avoidance 6-7): _______</p>
            <p>Cluster D (Negative cognitions/mood 8-14): _______</p>
            <p>Cluster E (Arousal/reactivity 15-20): _______</p>
            <p>Interpretation: _________________________________</p>
            <p>Clinician Signature: _________________________ Date: __________</p>
          </div>

          <div class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; margin: 10px; font-size: 16px;">Print This Form</button>
            <button onclick="window.close()" style="padding: 10px 20px; margin: 10px; font-size: 16px;">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-focus and optionally auto-print
    setTimeout(() => {
      printWindow.focus();
    }, 500);
  };

  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);
  const clusterScores = calculateClusterScores();
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Show instructions first
  if (showInstructions && instructions) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 max-w-4xl mx-auto">
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
          
          {/* Print Actions at Instructions Level */}
          <div className="flex items-center gap-2">
            <AssessmentActions
              assessmentType="pcl5"
              assessmentName="PCL-5 Assessment"
              clientName="Client Name"
              compact={true}
              showPrint={false}
              showShare={false}
              showDownload={false}
            />
          </div>
        </div>
        <AssessmentInstructionsComponent 
          instructions={instructions}
          onProceed={() => setShowInstructions(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              View Instructions
            </Button>
          </div>
          
          {/* Print Actions in Assessment Header */}
          <div className="flex items-center gap-2">
            <AssessmentActions
              assessmentType="pcl5"
              assessmentName="PCL-5 Assessment"
              clientName="Client Name"
              compact={true}
              showPrint={false}
              showShare={false}
              showDownload={false}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">PCL-5 Assessment</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">PTSD Checklist for DSM-5</p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-700">Assessment Progress</span>
            <span className="text-xs sm:text-sm text-slate-600">{currentQuestion + 1} of {questions.length}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="min-h-[400px]">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-lg sm:text-xl">Question {currentQuestion + 1}</CardTitle>
            <span className="px-2 sm:px-3 py-1 bg-primary/10 text-primary text-xs sm:text-sm font-medium rounded-full self-start">
              {questions[currentQuestion].cluster}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Question Text */}
          <div className="bg-slate-50 p-4 sm:p-6 rounded-lg">
            <p className="text-sm sm:text-base font-medium text-slate-900 mb-4">
              In the past month, how much were you bothered by:
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-slate-700 leading-relaxed break-words">
              {questions[currentQuestion].text}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base text-slate-900">Select your response:</h4>
            <div className="grid grid-cols-1 gap-2">
              {responseOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={answers[currentQuestion] === option.value ? "default" : "outline"}
                  className={`p-3 sm:p-4 text-left justify-start text-sm sm:text-base ${
                    answers[currentQuestion] === option.value 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => handleAnswer(option.value)}
                >
                  {answers[currentQuestion] === option.value && (
                    <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                  )}
                  <span className="break-words">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="font-medium text-sm sm:text-base text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">Clinical Notes</span>
            </h4>
            <Textarea
              placeholder="Add observations, context, or client quotes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] text-sm sm:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Card - Show when complete */}
      {isComplete && (
        <Card className={`${interpretation.bgColor} ${interpretation.borderColor} border-2`}>
          <CardHeader>
            <CardTitle className={`${interpretation.color} text-xl`}>
              Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total Score</p>
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/80</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Result</p>
                <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                  {interpretation.result}
                </p>
              </div>
            </div>
            
            {/* Cluster Scores */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-3">Symptom Cluster Scores:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-slate-600">Intrusion</p>
                  <p className="text-lg font-bold text-slate-900">{clusterScores.intrusion}/20</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-slate-600">Avoidance</p>
                  <p className="text-lg font-bold text-slate-900">{clusterScores.avoidance}/8</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-slate-600">Negative Cognition</p>
                  <p className="text-lg font-bold text-slate-900">{clusterScores.negativeCognition}/28</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-slate-600">Arousal</p>
                  <p className="text-lg font-bold text-slate-900">{clusterScores.arousal}/24</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Recommendation:</p>
              <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
            </div>

            <div className="pt-4 border-t border-slate-200 bg-blue-50 p-4 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Interpreting PCL-5 Scores:</p>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Cutoff score: 31-33 (Provisional PTSD diagnosis)</li>
                <li>Score range: 0-80</li>
                <li>Can track symptom change over time</li>
                <li>Consider functional impairment in clinical decisions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 px-4 sm:px-0">
        <Button
          variant="outline"
          onClick={previousQuestion}
          disabled={currentQuestion === 0}
          className="text-sm sm:text-base"
        >
          Previous
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="text-sm sm:text-base">
            Save & Pause
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handlePrintPaperForm()}
            className="text-sm sm:text-base flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Form
          </Button>
          {currentQuestion < questions.length - 1 && (
            <Button variant="outline" onClick={skipQuestion} className="text-sm sm:text-base">Skip</Button>
          )}
          {currentQuestion === questions.length - 1 ? (
            <Button 
              onClick={completeAssessment}
              className="bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base"
            >
              Complete Assessment
            </Button>
          ) : (
            <Button
              onClick={nextQuestion}
              disabled={answers[currentQuestion] === undefined}
              className="bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              Next
            </Button>
          )}
          
          {isComplete && (
            <AssessmentActions
              assessmentData={printData}
              onPrint={handlePrintAssessment}
              assessmentType="pcl5"
              assessmentName="PCL-5 Assessment"
              clientName="Client Name" // This would come from props
              compact={true}
            />
          )}
        </div>
      </div>

      {/* Print View Modal */}
      {showPrintView && printData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-6xl my-8">
            <AssessmentPrintView 
              assessmentData={printData} 
              onClose={closePrintView}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Pcl5Assessment;
