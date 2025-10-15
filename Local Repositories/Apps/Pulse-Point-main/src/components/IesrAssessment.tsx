import React, { useState } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';

const IesrAssessment = () => {
  const navigate = useNavigate();
  const [eventDescription, setEventDescription] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    { id: 1, text: "Any reminder brought back feelings about it", subscale: "intrusion" },
    { id: 2, text: "I had trouble staying asleep", subscale: "hyperarousal" },
    { id: 3, text: "Other things kept making me think about it", subscale: "intrusion" },
    { id: 4, text: "I felt irritable and angry", subscale: "hyperarousal" },
    { id: 5, text: "I avoided letting myself get upset when I thought about it or was reminded of it", subscale: "avoidance" },
    { id: 6, text: "I thought about it when I didn't mean to", subscale: "intrusion" },
    { id: 7, text: "I felt as if it hadn't happened or wasn't real", subscale: "avoidance" },
    { id: 8, text: "I stayed away from reminders about it", subscale: "avoidance" },
    { id: 9, text: "Pictures about it popped into my mind", subscale: "intrusion" },
    { id: 10, text: "I was jumpy and easily startled", subscale: "hyperarousal" },
    { id: 11, text: "I tried not to think about it", subscale: "avoidance" },
    { id: 12, text: "I was aware that I still had a lot of feelings about it, but I didn't deal with them", subscale: "avoidance" },
    { id: 13, text: "My feelings about it were kind of numb", subscale: "avoidance" },
    { id: 14, text: "I found myself acting or feeling like I was back at that time", subscale: "intrusion" },
    { id: 15, text: "I had trouble falling asleep", subscale: "hyperarousal" },
    { id: 16, text: "I had waves of strong feelings about it", subscale: "intrusion" },
    { id: 17, text: "I tried to remove it from my memory", subscale: "avoidance" },
    { id: 18, text: "I had trouble concentrating", subscale: "hyperarousal" },
    { id: 19, text: "Reminders of it caused me to have physical reactions, such as sweating, trouble breathing, nausea, or a pounding heart", subscale: "hyperarousal" },
    { id: 20, text: "I had dreams about it", subscale: "intrusion" },
    { id: 21, text: "I felt watchful and on-guard", subscale: "hyperarousal" },
    { id: 22, text: "I tried not to talk about it", subscale: "avoidance" }
  ];

  const responseOptions = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'A little bit' },
    { value: 2, label: 'Moderately' },
    { value: 3, label: 'Quite a bit' },
    { value: 4, label: 'Extremely' }
  ];

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers({ ...answers, [questionId]: value });
    sessionStorage.setItem('hasUnsavedAssessmentData', 'true');
  };

  const calculateScore = () => {
    const total = Object.values(answers).reduce((sum, value) => sum + value, 0);
    
    const intrusionItems = questions.filter(q => q.subscale === 'intrusion');
    const avoidanceItems = questions.filter(q => q.subscale === 'avoidance');
    const hyperarousalItems = questions.filter(q => q.subscale === 'hyperarousal');
    
    const intrusionScore = intrusionItems.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
    const avoidanceScore = avoidanceItems.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
    const hyperarousalScore = hyperarousalItems.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
    
    return {
      total,
      intrusion: intrusionScore,
      avoidance: avoidanceScore,
      hyperarousal: hyperarousalScore
    };
  };

  const getScoreInterpretation = (totalScore: number) => {
    if (totalScore >= 33) {
      return {
        result: 'Probable PTSD (Clinical Concern)',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        severity: 'High',
        recommendation: 'Total score indicates probable PTSD. Comprehensive clinical evaluation and trauma-focused treatment (e.g., CPT, PE, EMDR) strongly recommended. Consider referral to a trauma specialist.'
      };
    } else if (totalScore >= 24) {
      return {
        result: 'Significant PTSD Symptoms',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        severity: 'Moderate-High',
        recommendation: 'Significant post-traumatic stress symptoms present. Further clinical evaluation recommended. Consider trauma-focused psychotherapy and/or psychiatric consultation.'
      };
    } else if (totalScore >= 12) {
      return {
        result: 'Mild to Moderate Symptoms',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        severity: 'Mild-Moderate',
        recommendation: 'Some post-traumatic stress symptoms detected. Psychoeducation, supportive counseling, and monitoring recommended. Consider brief intervention or trauma-informed therapy.'
      };
    } else {
      return {
        result: 'Minimal Symptoms',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        severity: 'Low',
        recommendation: 'Minimal post-traumatic stress symptoms. Continue supportive monitoring as appropriate. Psychoeducation about trauma reactions may be helpful.'
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
        <title>IES-R Assessment</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 20px auto; padding: 0 20px; }
          h1, h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .question { margin-bottom: 20px; page-break-inside: avoid; }
          .options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 8px; }
          .option { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .checkbox { width: 20px; height: 20px; border: 1px solid #999; border-radius: 4px; }
          .instructions { background-color: #f0f8ff; border: 1px solid #bde0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .event-description { background-color: #fff9e6; border: 1px solid #ffd966; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .notes-section { margin-top: 30px; }
          textarea { width: 100%; min-height: 80px; border: 1px solid #ccc; border-radius: 4px; padding: 10px; font-family: sans-serif; }
          @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Impact of Event Scale - Revised (IES-R)</h1>
        
        <div class="instructions">
          <p><strong>Instructions:</strong> Below is a list of difficulties people sometimes have after stressful life events. Please read each item, and then indicate how distressing each difficulty has been for you <strong>during the past seven days</strong> with respect to the event described below.</p>
        </div>

        <div class="event-description">
          <p><strong>Traumatic Event:</strong></p>
          <textarea readonly>${eventDescription}</textarea>
        </div>

        <h2>Symptoms (Past 7 Days)</h2>
        ${questions.map(q => `
          <div class="question">
            <p><strong>${q.id}. ${q.text}</strong></p>
            <div class="options">
              ${responseOptions.map(opt => `
                <div class="option">
                  <div class="checkbox" style="${answers[q.id] === opt.value ? 'background-color: #333;' : ''}"></div>
                  <span style="font-size: 10px; text-align: center;">${opt.value}: ${opt.label}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}

        <div class="notes-section">
          <h2>Clinical Notes</h2>
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

  const canComplete = questions.every(q => answers[q.id] !== undefined) && eventDescription.trim() !== '';
  const scores = calculateScore();
  const interpretation = getScoreInterpretation(scores.total);

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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">IES-R Impact Assessment</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Impact of Event Scale - Revised</p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm sm:text-base text-blue-800 leading-relaxed break-words">
            Below is a list of difficulties people sometimes have after stressful life events. Please read each item, and then indicate how distressing each difficulty has been for you <strong>during the past seven days</strong> with respect to the event you describe below.
          </p>
        </CardContent>
      </Card>

      {/* Event Description */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Traumatic Event Description
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm text-amber-800 mb-3">
            Briefly describe the stressful life event you're assessing:
          </p>
          <Textarea
            placeholder="Example: Car accident on June 15th, witnessed injury..."
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            className="min-h-[80px] text-sm sm:text-base bg-white"
          />
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Symptoms (Past 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3 pb-6 border-b last:border-b-0">
              <p className="font-medium text-sm sm:text-base text-slate-900 break-words">
                {index + 1}. {question.text}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Total Score</p>
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{scores.total}/88</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Intrusion</p>
                <p className="text-base sm:text-lg font-semibold text-slate-700">{scores.intrusion}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Avoidance</p>
                <p className="text-base sm:text-lg font-semibold text-slate-700">{scores.avoidance}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600">Hyperarousal</p>
                <p className="text-base sm:text-lg font-semibold text-slate-700">{scores.hyperarousal}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2">Clinical Interpretation:</p>
              <p className={`text-base sm:text-lg font-semibold ${interpretation.color} break-words mb-2`}>
                {interpretation.result}
              </p>
              <p className="text-xs sm:text-sm text-slate-800 break-words">{interpretation.recommendation}</p>
            </div>
            <div className="pt-4 border-t border-slate-200 bg-white/50 p-4 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-slate-900 mb-2">📊 About the IES-R:</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                The IES-R is a 22-item self-report measure assessing subjective distress caused by traumatic events. It measures three PTSD symptom clusters: 
                Intrusion (re-experiencing), Avoidance (numbing/avoidance), and Hyperarousal (increased arousal). A total score of 33 or above suggests probable PTSD diagnosis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IesrAssessment;
