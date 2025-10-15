import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, X, BookOpen, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentActions from './AssessmentActions';

const TsqAssessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const instructions = getInstructionsById('tsq');

  const handlePrintPaperForm = () => {
    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TSQ Assessment</title>
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
        <h1>TSQ Assessment</h1>
        
        <div class="instructions">
          <p>Please consider the following reactions which sometimes occur after traumatic events. This questionnaire is concerned with your personal reactions to the traumatic event which happened to you. Please indicate whether or not you have experienced any of the following at least twice in the past week:</p>
        </div>

        <h2>Questions</h2>
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

  const questions = [
    {
      id: 1,
      text: "Upsetting thoughts or memories about the event that have come into your mind against your will"
    },
    {
      id: 2,
      text: "Upsetting dreams about the event"
    },
    {
      id: 3,
      text: "Acting or feeling as though the event was happening again"
    },
    {
      id: 4,
      text: "Feeling upset by reminders of the event"
    },
    {
      id: 5,
      text: "Bodily reactions (such as fast heartbeat, sweating, dizziness) when reminded of the event"
    },
    {
      id: 6,
      text: "Difficulty falling or staying asleep"
    },
    {
      id: 7,
      text: "Irritability or outbursts of anger"
    },
    {
      id: 8,
      text: "Difficulty concentrating"
    },
    {
      id: 9,
      text: "Heightened awareness of potential dangers to yourself and others"
    },
    {
      id: 10,
      text: "Being jumpy or being startled at something unexpected"
    }
  ];

  const handleQuestionAnswer = (questionId: number, answer: boolean) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const calculateScore = () => {
    return Object.values(answers).filter(answer => answer === true).length;
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 6) {
      return {
        result: 'High Risk for PTSD',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Score indicates high risk for PTSD. A comprehensive evaluation by a qualified professional is strongly recommended.'
      };
    } else {
      return {
        result: 'Low Risk for PTSD',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Score indicates low risk for PTSD. Continue monitoring and provide appropriate support as needed.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const canComplete = questions.every(q => answers[q.id] !== undefined);
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
              assessmentType="tsq"
              assessmentName="TSQ Assessment"
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
              assessmentType="tsq"
              assessmentName="TSQ Assessment"
              clientName="Client Name"
              compact={true}
              showPrint={false}
              showShare={false}
              showDownload={false}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">TSQ Screening</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Trauma Screening Questionnaire</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            Please consider the following reactions which sometimes occur after traumatic events. 
            This questionnaire is concerned with your personal reactions to the traumatic event which happened to you. 
            Please indicate whether or not you have experienced any of the following at least twice in the past week:
          </p>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>In the past week, have you experienced any of the following at least twice?</CardTitle>
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
                <Button
                  variant="outline"
                  onClick={() => {
                    const newAnswers = { ...answers };
                    delete newAnswers[question.id];
                    setAnswers(newAnswers);
                  }}
                  className="text-slate-500 text-sm sm:text-base"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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

      {/* Results */}
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
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/10</p>
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 px-4 sm:px-0">
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
    </div>
  );
};

export default TsqAssessment;
