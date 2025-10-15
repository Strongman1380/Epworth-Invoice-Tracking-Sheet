import React, { useState } from 'react';
import { ArrowLeft, FileText, Check, BookOpen, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';

const CdRisc10Assessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    {
      id: 1,
      text: "I am able to adapt when changes occur"
    },
    {
      id: 2,
      text: "I can deal with whatever comes my way"
    },
    {
      id: 3,
      text: "I try to see the humorous side of things when I am faced with problems"
    },
    {
      id: 4,
      text: "Having to cope with stress can make me stronger"
    },
    {
      id: 5,
      text: "I tend to bounce back after illness, injury, or other hardships"
    },
    {
      id: 6,
      text: "I believe I can achieve my goals, even if there are obstacles"
    },
    {
      id: 7,
      text: "Under pressure, I stay focused and think clearly"
    },
    {
      id: 8,
      text: "I am not easily discouraged by failure"
    },
    {
      id: 9,
      text: "I think of myself as a strong person when dealing with life's challenges"
    },
    {
      id: 10,
      text: "I am able to handle unpleasant or painful feelings like sadness, fear, and anger"
    }
  ];

  const responseOptions = [
    { value: 0, label: 'Not true at all' },
    { value: 1, label: 'Rarely true' },
    { value: 2, label: 'Sometimes true' },
    { value: 3, label: 'Often true' },
    { value: 4, label: 'True nearly all the time' }
  ];

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
    sessionStorage.setItem('hasUnsavedAssessmentData', 'true');
  };

  const calculateScore = () => {
    return Object.values(answers).reduce((sum, value) => sum + value, 0);
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 32) {
      return {
        result: 'High Resilience',
        severity: 'High',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'You demonstrate strong resilience and adaptive coping skills. Continue to maintain these strengths and use them as resources during challenging times.'
      };
    } else if (score >= 25) {
      return {
        result: 'Moderate-High Resilience',
        severity: 'Moderate-High',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        recommendation: 'You show good resilience with room for continued growth. Consider building on your existing strengths and developing additional coping strategies.'
      };
    } else if (score >= 18) {
      return {
        result: 'Moderate Resilience',
        severity: 'Moderate',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'You have moderate resilience. Working on developing additional coping skills and support systems could enhance your ability to manage stress and adversity.'
      };
    } else {
      return {
        result: 'Low Resilience',
        severity: 'Low',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        recommendation: 'Building resilience skills may be beneficial. Consider seeking support to develop coping strategies, problem-solving skills, and stress management techniques.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('assessment-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handlePrintResults = () => {
    const score = calculateScore();
    const interpretation = getScoreInterpretation(score);
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>CD-RISC-10 Assessment Results</title>
        <style>
          @media print {
            @page { margin: 0.75in; }
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
          }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            max-width: 8.5in; 
            margin: 0 auto; 
            padding: 20px;
            background: white;
          }
          .header { 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          .header h1 { 
            color: #1e40af; 
            margin: 0 0 8px 0; 
            font-size: 28px;
            font-weight: 600;
          }
          .header .subtitle { 
            color: #64748b; 
            font-size: 14px;
            margin: 0;
          }
          .meta-info { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0;
            border-radius: 8px; 
            padding: 16px; 
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .meta-item { margin: 0; }
          .meta-label { 
            font-weight: 600; 
            color: #475569;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-value { 
            color: #1f2937; 
            font-size: 14px;
            margin-top: 4px;
          }
          .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          .section-title { 
            color: #1e40af; 
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          .score-card {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 24px;
            text-align: center;
          }
          .score-value {
            font-size: 48px;
            font-weight: 700;
            margin: 8px 0;
            letter-spacing: -1px;
          }
          .score-label {
            font-size: 14px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .score-interpretation {
            font-size: 20px;
            font-weight: 600;
            margin-top: 12px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.3);
          }
          .interpretation-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            border-radius: 8px;
            margin: 16px 0;
          }
          .interpretation-box h3 {
            color: #1e40af;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
          }
          .interpretation-box p {
            margin: 8px 0;
            color: #334155;
            font-size: 14px;
            line-height: 1.7;
          }
          .responses-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 13px;
          }
          .responses-table th {
            background: #f1f5f9;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
          }
          .responses-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
          }
          .responses-table tr:last-child td {
            border-bottom: none;
          }
          .notes-section {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 20px;
            margin-top: 24px;
          }
          .notes-section h3 {
            color: #92400e;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
          }
          .notes-content {
            color: #451a03;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.7;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
          .disclaimer {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            font-size: 12px;
            color: #78350f;
          }
          .disclaimer strong {
            color: #92400e;
          }
          .print-buttons {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .print-buttons button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 32px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            margin: 0 8px;
            transition: background 0.2s;
          }
          .print-buttons button:hover {
            background: #2563eb;
          }
          .print-buttons button.secondary {
            background: #64748b;
          }
          .print-buttons button.secondary:hover {
            background: #475569;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CD-RISC-10 Resilience Assessment Results</h1>
          <p class="subtitle">Connor-Davidson Resilience Scale - 10 Item Version</p>
        </div>

        <div class="meta-info">
          <div class="meta-item">
            <div class="meta-label">Assessment Date</div>
            <div class="meta-value">${currentDate}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Assessment Type</div>
            <div class="meta-value">Resilience Measure</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Time Period</div>
            <div class="meta-value">Past Month</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Questions</div>
            <div class="meta-value">10 Items</div>
          </div>
        </div>

        <div class="print-buttons no-print">
          <button onclick="window.print()">🖨️ Print Document</button>
          <button class="secondary" onclick="window.close()">← Back to Assessment</button>
        </div>

        <div class="section">
          <div class="score-card">
            <div class="score-label">Total Resilience Score</div>
            <div class="score-value">${score} / 40</div>
            <div class="score-interpretation">${interpretation.result}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Clinical Interpretation</h2>
          <div class="interpretation-box">
            <h3>Resilience Level: ${interpretation.severity}</h3>
            <p><strong>Score Range:</strong> ${
              score >= 32 ? '32-40 (High Resilience)' :
              score >= 25 ? '25-31 (Moderate-High Resilience)' :
              score >= 18 ? '18-24 (Moderate Resilience)' :
              'Below 18 (Low Resilience)'
            }</p>
            <p><strong>Clinical Significance:</strong> ${interpretation.recommendation}</p>
            <p style="margin-top: 16px;">
              The CD-RISC-10 measures an individual's ability to cope with stress and adversity. Higher scores indicate 
              greater resilience and adaptive capacity. This assessment evaluates responses over the past month and 
              provides insight into current stress-coping abilities.
            </p>
          </div>
        </div>

        <div class="section page-break">
          <h2 class="section-title">Individual Item Responses</h2>
          <table class="responses-table">
            <thead>
              <tr>
                <th style="width: 60%">Item</th>
                <th style="width: 20%; text-align: center;">Response</th>
                <th style="width: 20%; text-align: center;">Score</th>
              </tr>
            </thead>
            <tbody>
              ${questions.map((q, idx) => `
                <tr>
                  <td>${idx + 1}. ${q.text}</td>
                  <td style="text-align: center;">${responseOptions.find(opt => opt.value === answers[q.id])?.label || 'Not answered'}</td>
                  <td style="text-align: center; font-weight: 600;">${answers[q.id] ?? '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${notes ? `
          <div class="notes-section">
            <h3>📋 Clinical Notes & Observations</h3>
            <div class="notes-content">${notes}</div>
          </div>
        ` : ''}

        <div class="disclaimer">
          <strong>⚠️ Clinical Disclaimer:</strong> This assessment is a screening tool and should not be used as the sole basis for clinical diagnosis. 
          Results should be interpreted by a qualified mental health professional in the context of a comprehensive clinical evaluation. 
          If you have concerns about mental health, please consult with a licensed healthcare provider.
        </div>

        <div class="footer">
          <p><strong>Assessment Tool:</strong> Connor-Davidson Resilience Scale (CD-RISC-10)</p>
          <p>This is a confidential document. Handle in accordance with privacy regulations.</p>
          <p>Generated: ${new Date().toLocaleString('en-US')}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printableContent);
      printWindow.document.close();
      sessionStorage.removeItem('hasUnsavedAssessmentData');
    }
  };

  const handlePrintPaperForm = () => {
    const printableContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CD-RISC-10 Resilience Assessment</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 0 20px; }
          h1, h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .question { margin-bottom: 20px; page-break-inside: avoid; }
          .options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 8px; }
          .option { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
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
        <h1>CD-RISC-10 Resilience Assessment</h1>
        
        <div class="instructions">
          <p><strong>Instructions:</strong> For each statement, please indicate how much you agree with it by selecting the response that best describes you over the past month.</p>
          <p><strong>Rating Scale:</strong> 0 = Not true at all | 1 = Rarely true | 2 = Sometimes true | 3 = Often true | 4 = True nearly all the time</p>
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">CD-RISC-10 Resilience Assessment</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Connor-Davidson Resilience Scale - 10 Item Version</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            For each statement below, please indicate how much you agree with it by selecting the response that best describes you <strong>over the past month</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Resilience Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3 pb-6 border-b last:border-b-0">
              <p className="font-medium text-sm sm:text-base text-slate-900 break-words">
                {index + 1}. {question.text}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {responseOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={answers[question.id] === option.value ? "default" : "outline"}
                    onClick={() => handleAnswer(question.id, option.value)}
                    className={`flex flex-col items-center gap-1 h-auto py-3 text-xs ${
                      answers[question.id] === option.value ? 'bg-primary' : ''
                    }`}
                  >
                    <span className="font-bold text-lg">{option.value}</span>
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

      {/* Complete Assessment Button - Sticky */}
      {!isComplete && (
        <Card className="sticky bottom-4 shadow-lg border-2 border-primary bg-white z-10">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-slate-900">
                  {canComplete ? 'Ready to complete!' : `${questions.filter(q => answers[q.id] !== undefined).length} of ${questions.length} questions answered`}
                </p>
                <p className="text-sm text-slate-600">
                  {canComplete ? 'Click below to view your results' : 'Answer all questions to continue'}
                </p>
              </div>
              <Button 
                onClick={completeAssessment} 
                disabled={!canComplete}
                size="lg"
                className="bg-primary hover:bg-primary/90 px-8 w-full sm:w-auto"
              >
                <Check className="h-5 w-5 mr-2" />
                Complete Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isComplete && (
        <div id="assessment-results">
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
                  <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/40</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-600">Resilience Level</p>
                  <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words`}>
                    {interpretation.result}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Interpretation:</p>
                <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
              </div>
              <div className="pt-4 border-t border-slate-200 bg-white/50 p-4 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-slate-900 mb-2">📊 About the CD-RISC-10:</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The CD-RISC-10 is a widely used measure of resilience and stress-coping ability. Higher scores indicate greater resilience. 
                  This assessment can help identify areas of strength and opportunities for building resilience skills.
                </p>
              </div>

              {/* Print Results Button */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handlePrintResults}
                  size="lg"
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Printer className="h-5 w-5 mr-2" />
                  Print Professional Report
                </Button>
                <Button 
                  onClick={handlePrintPaperForm}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Print Blank Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CdRisc10Assessment;
