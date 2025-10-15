import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, AlertTriangle, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';

const Phq9Assessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [functionalImpairment, setFunctionalImpairment] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    {
      id: 1,
      text: "Little interest or pleasure in doing things"
    },
    {
      id: 2,
      text: "Feeling down, depressed, or hopeless"
    },
    {
      id: 3,
      text: "Trouble falling or staying asleep, or sleeping too much"
    },
    {
      id: 4,
      text: "Feeling tired or having little energy"
    },
    {
      id: 5,
      text: "Poor appetite or overeating"
    },
    {
      id: 6,
      text: "Feeling bad about yourself - or that you are a failure or have let yourself or your family down"
    },
    {
      id: 7,
      text: "Trouble concentrating on things, such as reading the newspaper or watching television"
    },
    {
      id: 8,
      text: "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual"
    },
    {
      id: 9,
      text: "Thoughts that you would be better off dead, or of hurting yourself in some way"
    }
  ];

  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' }
  ];

  const impairmentOptions = [
    'Not difficult at all',
    'Somewhat difficult',
    'Very difficult',
    'Extremely difficult'
  ];

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
    sessionStorage.setItem('hasUnsavedAssessmentData', 'true');
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, value) => sum + value, 0);
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 20) {
      return {
        result: 'Severe Depression',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        severity: 'Severe',
        recommendation: 'Immediate treatment with psychotherapy and/or pharmacotherapy is strongly recommended. Consider urgent psychiatric evaluation if there are thoughts of self-harm.'
      };
    } else if (score >= 15) {
      return {
        result: 'Moderately Severe Depression',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        severity: 'Moderately Severe',
        recommendation: 'Active treatment with psychotherapy and/or pharmacotherapy is warranted. Close monitoring and follow-up recommended.'
      };
    } else if (score >= 10) {
      return {
        result: 'Moderate Depression',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        severity: 'Moderate',
        recommendation: 'Treatment with psychotherapy and/or pharmacotherapy should be considered. Watchful waiting with repeat PHQ-9 at follow-up may be appropriate.'
      };
    } else if (score >= 5) {
      return {
        result: 'Mild Depression',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        severity: 'Mild',
        recommendation: 'Watchful waiting with repeat PHQ-9 at follow-up. Consider counseling, follow-up, or pharmacotherapy depending on duration and functional impairment.'
      };
    } else {
      return {
        result: 'Minimal or No Depression',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        severity: 'None-Minimal',
        recommendation: 'No depression treatment indicated. Continue supportive monitoring as appropriate.'
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
        <title>PHQ-9 Depression Assessment</title>
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
        <h1>PHQ-9 Patient Depression Questionnaire</h1>
        
        <div class="instructions">
          <p><strong>Instructions:</strong> Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?</p>
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

        <div class="question" style="margin-top: 30px; border-top: 2px solid #ccc; padding-top: 20px;">
          <p><strong>10. If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?</strong></p>
          <div style="margin-top: 10px;">
            ${impairmentOptions.map(opt => `
              <label style="display: block; margin: 8px 0;">
                <input type="radio" name="impairment" ${functionalImpairment === opt ? 'checked' : ''}> ${opt}
              </label>
            `).join('')}
          </div>
        </div>

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
  const hasQuestion9Positive = (answers[9] || 0) > 0;

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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">PHQ-9 Depression Screening</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Patient Health Questionnaire - 9 Items</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            Over the <strong>last 2 weeks</strong>, how often have you been bothered by any of the following problems?
          </p>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Depression Symptoms</CardTitle>
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

      {/* Functional Impairment Question */}
      <Card>
        <CardHeader>
          <CardTitle>Functional Impairment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <p className="font-medium text-sm sm:text-base text-slate-900">
            If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {impairmentOptions.map((option) => (
              <Button
                key={option}
                variant={functionalImpairment === option ? "default" : "outline"}
                onClick={() => setFunctionalImpairment(option)}
                className={`justify-start text-sm ${functionalImpairment === option ? 'bg-primary' : ''}`}
              >
                {functionalImpairment === option && <Check className="h-4 w-4 mr-2" />}
                {option}
              </Button>
            ))}
          </div>
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
        <>
          {/* Suicide Risk Alert */}
          {hasQuestion9Positive && (
            <Card className="bg-red-50 border-red-300 border-2">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  IMPORTANT: Suicide Risk Assessment Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-900 font-medium">
                  The individual endorsed thoughts of self-harm (Question #9). Immediate suicide risk assessment and safety planning is required.
                  Consider psychiatric consultation and crisis intervention as appropriate.
                </p>
              </CardContent>
            </Card>
          )}

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
                  <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/27</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-600">Depression Severity</p>
                  <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                    {interpretation.result}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Recommendation:</p>
                <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
              </div>
              {functionalImpairment && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Functional Impairment:</p>
                  <p className="text-xs sm:text-sm text-slate-800">{functionalImpairment}</p>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200 bg-white/50 p-4 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-slate-900 mb-2">📊 About the PHQ-9:</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The PHQ-9 is a validated diagnostic tool for assessing depression severity. Scores of 10 or greater are considered clinically significant. 
                  This tool can be used for initial diagnosis, monitoring treatment response, and tracking changes over time.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Phq9Assessment;
