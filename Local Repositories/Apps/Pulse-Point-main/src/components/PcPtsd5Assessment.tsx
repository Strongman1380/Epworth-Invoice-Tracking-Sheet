import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Check, X, BookOpen, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';
import AssessmentActions from './AssessmentActions';

const PcPtsd5Assessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [traumaExposure, setTraumaExposure] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, closePrintView } = useAssessmentPrint();

  const instructions = getInstructionsById('pc-ptsd-5');

  const questions = [
    {
      id: 1,
      text: "Had nightmares about the event(s) or thought about the event(s) when you did not want to?"
    },
    {
      id: 2,
      text: "Tried hard not to think about the event(s) or gone out of your way to avoid situations that reminded you of the event(s)?"
    },
    {
      id: 3,
      text: "Been constantly on guard, watchful, or easily startled?"
    },
    {
      id: 4,
      text: "Felt numb or detached from people, activities, or your surroundings?"
    },
    {
      id: 5,
      text: "Felt guilty or unable to stop blaming yourself or others for the event(s) or any problems the event(s) may have caused?"
    }
  ];

  const handlePrintAssessment = () => {
    const allQuestions = [
      {
        id: 0,
        text: "Have you ever in your life experienced a traumatic event?",
        category: "Trauma Exposure"
      },
      ...questions
    ];

    const allAnswers = {
      0: traumaExposure,
      ...answers
    };

    const printData = generatePrintData(
      'PC-PTSD-5',
      allQuestions,
      allAnswers,
      {
        clientName: 'Client Name',
        score,
        maxScore: 5,
        result: interpretation.result,
        interpretation: interpretation.recommendation,
        riskLevel: score >= 3 ? 'high' : 'low',
        notes
      }
    );
    openPrintView(printData);
  };

  const handlePrintPaperForm = () => {
    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PC-PTSD-5 Assessment</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 0 20px; }
          h1, h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .question { margin-bottom: 20px; }
          .options { display: flex; gap: 20px; }
          .option { display: flex; align-items: center; gap: 5px; }
          .checkbox { width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; }
          .instructions { background-color: #f0f8ff; border: 1px solid #bde0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .notes-section { margin-top: 30px; }
          textarea { width: 100%; min-height: 100px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-family: sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>PC-PTSD-5 Assessment</h1>
        
        <div class="instructions">
          <p>Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. For example: a serious accident or fire, a physical or sexual assault or abuse, an earthquake or flood, a war, seeing someone be killed or seriously injured, or having a loved one die through homicide or suicide.</p>
        </div>

        <h2>Questions</h2>
        <div class="question">
          <p><strong>Have you ever in your life experienced this kind of event?</strong></p>
          <div class="options">
            <div class="option"><div class="checkbox" style="${traumaExposure === true ? 'background-color: #333;' : ''}"></div> Yes</div>
            <div class="option"><div class="checkbox" style="${traumaExposure === false ? 'background-color: #333;' : ''}"></div> No</div>
          </div>
        </div>

        <p><strong>In the past month, have you:</strong></p>
        ${questions.map(q => `
          <div class="question">
            <p>${q.id}. ${q.text}</p>
            <div class="options">
              <div class="option"><div class="checkbox" style="${answers[q.id] === true ? 'background-color: #333;' : ''}"></div> Yes</div>
              <div class="option"><div class="checkbox" style="${answers[q.id] === false ? 'background-color: #333;' : ''}"></div> No</div>
            </div>
          </div>
        `).join('')}

        <div class="notes-section">
          <h2>Notes</h2>
          <textarea readonly>${notes}</textarea>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()">Print</button>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableContent);
      printWindow.document.close();
    }
  };

  const handleTraumaExposureAnswer = (response: boolean) => {
    setTraumaExposure(response);
    if (!response) {
      setIsComplete(true);
    }
  };

  const handleQuestionAnswer = (questionId: number, answer: boolean) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const calculateScore = () => {
    if (traumaExposure === false) return 0;
    return Object.values(answers).filter(answer => answer === true).length;
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 3) {
      return {
        result: 'Positive Screen',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Score indicates probable PTSD. A comprehensive evaluation by a qualified professional is recommended.'
      };
    } else {
      return {
        result: 'Negative Screen',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Score does not indicate probable PTSD. Continue monitoring and provide appropriate support as needed.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const canComplete = traumaExposure === false || (traumaExposure === true && questions.every(q => answers[q.id] !== undefined));
  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);

  // Show instructions first, then assessment
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
              assessmentType="pcptsd5"
              assessmentName="PC-PTSD-5 Assessment"
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
              assessmentType="pcptsd5"
              assessmentName="PC-PTSD-5 Assessment"
              clientName="Client Name"
              compact={true}
              showPrint={false}
              showShare={false}
              showDownload={false}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">PC-PTSD-5 Screening</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Primary Care PTSD Screen for DSM-5</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. For example:
          </p>
          <ul className="mt-3 space-y-1 text-sm sm:text-base text-blue-800 list-disc list-inside">
            <li className="break-words">a serious accident or fire</li>
            <li className="break-words">a physical or sexual assault or abuse</li>
            <li className="break-words">an earthquake or flood</li>
            <li className="break-words">a war</li>
            <li className="break-words">seeing someone be killed or seriously injured</li>
            <li className="break-words">having a loved one die through homicide or suicide</li>
          </ul>
        </CardContent>
      </Card>

      {/* Trauma Exposure Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Initial Screening Question
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <p className="text-base sm:text-lg font-medium text-slate-900 break-words">
            Have you ever in your life experienced this kind of event?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant={traumaExposure === true ? "default" : "outline"}
              onClick={() => handleTraumaExposureAnswer(true)}
              className={`flex items-center gap-2 text-sm sm:text-base ${traumaExposure === true ? 'bg-primary' : ''}`}
            >
              {traumaExposure === true && <Check className="h-4 w-4 flex-shrink-0" />}
              Yes
            </Button>
            <Button
              variant={traumaExposure === false ? "default" : "outline"}
              onClick={() => handleTraumaExposureAnswer(false)}
              className={`flex items-center gap-2 text-sm sm:text-base ${traumaExposure === false ? 'bg-primary' : ''}`}
            >
              {traumaExposure === false && <Check className="h-4 w-4 flex-shrink-0" />}
              No
            </Button>
          </div>
          
          {traumaExposure === false && (
            <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-700 font-medium break-words">
                Screening complete. Score = 0 (No trauma exposure reported)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Questions - Only show if trauma exposure is true */}
      {traumaExposure === true && (
        <Card>
          <CardHeader>
            <CardTitle>In the past month, have you:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-3">
                <p className="font-medium text-sm sm:text-base text-slate-900 break-words">
                  {index + 1}. {question.text}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    variant={answers[question.id] === true ? "default" : "outline"}
                    onClick={() => handleQuestionAnswer(question.id, true)}
                    className={`flex items-center gap-2 text-sm sm:text-base ${answers[question.id] === true ? 'bg-primary' : ''}`}
                  >
                    {answers[question.id] === true && <Check className="h-4 w-4 flex-shrink-0" />}
                    Yes
                  </Button>
                  <Button
                    variant={answers[question.id] === false ? "default" : "outline"}
                    onClick={() => handleQuestionAnswer(question.id, false)}
                    className={`flex items-center gap-2 text-sm sm:text-base ${answers[question.id] === false ? 'bg-primary' : ''}`}
                  >
                    {answers[question.id] === false && <X className="h-4 w-4 flex-shrink-0" />}
                    No
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clinical Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Textarea
            placeholder="Add any relevant observations, client quotes, or contextual information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] text-sm sm:text-base"
          />
        </CardContent>
      </Card>

      {/* Results - Show only when complete */}
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
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/5</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Result</p>
                <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                  {interpretation.result}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Recommendation:</p>
              <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { /* Save & Pause Logic */ }}>Save & Pause</Button>
          <Button variant="outline" onClick={handlePrintPaperForm}>Print Form</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { /* Skip Logic */ }}>Skip</Button>
          <Button onClick={completeAssessment} disabled={!canComplete}>
            {isComplete ? 'View Results' : 'Complete Assessment'}
          </Button>
        </div>
      </div>

      {/* Results View */}
      {isComplete && (
        <Card className={`mt-6 ${interpretation.bgColor} ${interpretation.borderColor}`}>
          <CardHeader>
            <CardTitle className={`${interpretation.color} text-xl`}>
              Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total Score</p>
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/5</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Result</p>
                <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                  {interpretation.result}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Recommendation:</p>
              <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}

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

export default PcPtsd5Assessment;
