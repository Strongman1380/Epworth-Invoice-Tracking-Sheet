import React, { useState } from 'react';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';

const Gad7Assessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    {
      id: 1,
      text: "Feeling nervous, anxious, or on edge"
    },
    {
      id: 2,
      text: "Not being able to stop or control worrying"
    },
    {
      id: 3,
      text: "Worrying too much about different things"
    },
    {
      id: 4,
      text: "Trouble relaxing"
    },
    {
      id: 5,
      text: "Being so restless that it's hard to sit still"
    },
    {
      id: 6,
      text: "Becoming easily annoyed or irritable"
    },
    {
      id: 7,
      text: "Feeling afraid as if something awful might happen"
    }
  ];

  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' }
  ];

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
    sessionStorage.setItem('hasUnsavedAssessmentData', 'true');
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, value) => sum + value, 0);
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 15) {
      return {
        result: 'Severe Anxiety',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        severity: 'Severe',
        recommendation: 'Active treatment is warranted. Consider psychotherapy (e.g., CBT) and/or pharmacotherapy. Referral to a mental health specialist is recommended.'
      };
    } else if (score >= 10) {
      return {
        result: 'Moderate Anxiety',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        severity: 'Moderate',
        recommendation: 'Probable generalized anxiety disorder. Consider psychotherapy and/or pharmacotherapy. Further evaluation and monitoring recommended.'
      };
    } else if (score >= 5) {
      return {
        result: 'Mild Anxiety',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        severity: 'Mild',
        recommendation: 'Possible anxiety disorder. Watchful waiting, psychoeducation, and reassessment recommended. Consider counseling or brief therapy.'
      };
    } else {
      return {
        result: 'Minimal Anxiety',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        severity: 'Minimal',
        recommendation: 'No significant anxiety symptoms detected. Continue supportive monitoring as appropriate.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const handlePrintPaperForm = () => {
    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>GAD-7 Anxiety Assessment</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 0 20px; }
          h1, h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .question { margin-bottom: 20px; page-break-inside: avoid; }
          .options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
          .option { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .checkbox { width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; }
          .instructions { background-color: #f0f8ff; border: 1px solid #bde0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .notes-section { margin-top: 30px; }
          textarea { width: 100%; min-height: 100px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-family: sans-serif; }
          @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>GAD-7 Anxiety Assessment</h1>
        
        <div class="instructions">
          <p><strong>Instructions:</strong> Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?</p>
        </div>

        <h2>Questions</h2>
        ${questions.map(q => `
          <div class="question">
            <p><strong>${q.id}. ${q.text}</strong></p>
            <div class="options">
              ${responseOptions.map(opt => `
                <div class="option">
                  <div class="checkbox" style="${answers[q.id] === opt.value ? 'background-color: #333;' : ''}"></div>
                  <span style="font-size: 11px; text-align: center;">${opt.value}: ${opt.label}</span>
                </div>
              `).join('')}
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
      sessionStorage.removeItem('hasUnsavedAssessmentData');
    }
  };

  const canComplete = questions.every(q => answers[q.id] !== undefined);
  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
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
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">GAD-7 Anxiety Screening</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Generalized Anxiety Disorder - 7 Items</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            Over the <strong>last 2 weeks</strong>, how often have you been bothered by the following problems?
          </p>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Anxiety Symptoms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3 pb-6 border-b last:border-b-0">
              <p className="font-medium text-sm sm:text-base text-slate-900 break-words">
                {index + 1}. {question.text}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {responseOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={answers[question.id] === option.value ? "default" : "outline"}
                    onClick={() => handleAnswer(question.id, option.value)}
                    className={`flex flex-col items-center gap-1 h-auto py-3 text-xs ${
                      answers[question.id] === option.value ? 'bg-primary' : ''
                    }`}
                  >
                    <span className="font-bold text-base">{option.value}</span>
                    <span className="text-center leading-tight">{option.label}</span>
                  </Button>
                ))}
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
            placeholder="Add any relevant observations, context, or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] text-sm sm:text-base"
          />
        </CardContent>
      </Card>

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintPaperForm}>
            <Printer className="h-4 w-4 mr-2" />
            Print Form
          </Button>
        </div>
        <Button 
          onClick={completeAssessment} 
          disabled={!canComplete}
          className="bg-primary hover:bg-primary/90"
        >
          {isComplete ? 'View Results' : 'Complete Assessment'}
        </Button>
      </div>

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
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/21</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Anxiety Severity</p>
                <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                  {interpretation.result}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Recommendation:</p>
              <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
            </div>
            <div className="pt-4 border-t border-slate-200 bg-white/50 p-4 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-slate-900 mb-2">📊 About the GAD-7:</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                The GAD-7 is a validated screening tool for generalized anxiety disorder. Scores of 10 or greater indicate probable GAD and warrant further evaluation. 
                This tool can be used for initial screening, assessing symptom severity, and monitoring treatment response over time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Gad7Assessment;
