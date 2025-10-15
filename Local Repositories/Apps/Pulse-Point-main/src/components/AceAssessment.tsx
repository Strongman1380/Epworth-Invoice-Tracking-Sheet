
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, FileText, ArrowLeft, BookOpen, Printer, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate } from 'react-router-dom';
import AssessmentInstructionsComponent from './AssessmentInstructions';
import { getInstructionsById } from '../data/assessmentInstructions';
import AssessmentPrintView from './AssessmentPrintView';
import { useAssessmentPrint } from '../hooks/useAssessmentPrint';
import AssessmentActions from './AssessmentActions';

const AceAssessment = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showClientFriendly, setShowClientFriendly] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const { printData, showPrintView, generatePrintData, openPrintView, openPrintViewWithAI, closePrintView, aiLoading } = useAssessmentPrint();

  const instructions = getInstructionsById('ace');

  // Complete ACE Questionnaire - All 10 questions
  const questions = [
    {
      id: 1,
      text: "Did a parent or other adult in the household often or very often swear at you, insult you, put you down, or humiliate you?",
      clinical: "Did a parent or other adult in the household often or very often swear at you, insult you, put you down, or humiliate you? Or act in a way that made you afraid that you might be physically hurt?",
      clientFriendly: "When you were growing up, did adults in your home often say hurtful things to you or make you feel bad about yourself?",
      category: "Emotional Abuse"
    },
    {
      id: 2,
      text: "Did a parent or other adult in the household often or very often push, grab, slap, or throw something at you?",
      clinical: "Did a parent or other adult in the household often or very often push, grab, slap, or throw something at you? Or ever hit you so hard that you had marks or were injured?",
      clientFriendly: "When you were a child, did adults in your home sometimes hurt you physically, like hitting or pushing you?",
      category: "Physical Abuse"
    },
    {
      id: 3,
      text: "Did an adult or person at least 5 years older than you ever touch or fondle you or have you touch their body in a sexual way?",
      clinical: "Did an adult or person at least 5 years older than you ever touch or fondle you or have you touch their body in a sexual way? Or attempt or actually have oral, anal, or vaginal intercourse with you?",
      clientFriendly: "Did an older person ever touch you in a way that made you uncomfortable or ask you to touch them inappropriately?",
      category: "Sexual Abuse"
    },
    {
      id: 4,
      text: "Did you often or very often feel that no one in your family loved you or thought you were important or special?",
      clinical: "Did you often or very often feel that no one in your family loved you or thought you were important or special? Or that your family didn't look out for each other, feel close to each other, or support each other?",
      clientFriendly: "Growing up, did you often feel like no one in your family really cared about you or showed you love?",
      category: "Emotional Neglect"
    },
    {
      id: 5,
      text: "Did you often or very often feel that you didn't have enough to eat, had to wear dirty clothes, and had no one to protect you?",
      clinical: "Did you often or very often feel that you didn't have enough to eat, had to wear dirty clothes, and had no one to protect you? Or that your parents were too drunk or high to take care of you or take you to the doctor if you needed it?",
      clientFriendly: "When you were young, did you often not have enough food, clean clothes, or someone to take care of you when you were sick?",
      category: "Physical Neglect"
    },
    {
      id: 6,
      text: "Were your parents ever separated or divorced?",
      clinical: "Were your parents ever separated or divorced?",
      clientFriendly: "Did your parents separate or divorce while you were growing up?",
      category: "Household Dysfunction"
    },
    {
      id: 7,
      text: "Was your mother or stepmother often or very often pushed, grabbed, slapped, or had something thrown at her?",
      clinical: "Was your mother or stepmother often or very often pushed, grabbed, slapped, or had something thrown at her? Or sometimes, often, or very often kicked, bitten, hit with a fist, or hit with something hard? Or ever repeatedly hit over at least a few minutes or threatened with a gun or knife?",
      clientFriendly: "Did you see violence in your home, like one parent hurting another?",
      category: "Household Dysfunction"
    },
    {
      id: 8,
      text: "Did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?",
      clinical: "Did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?",
      clientFriendly: "Did anyone in your home have problems with drinking alcohol or using drugs?",
      category: "Household Dysfunction"
    },
    {
      id: 9,
      text: "Was a household member depressed or mentally ill, or did a household member attempt suicide?",
      clinical: "Was a household member depressed or mentally ill, or did a household member attempt suicide?",
      clientFriendly: "Did anyone in your home struggle with depression, mental illness, or try to hurt themselves?",
      category: "Household Dysfunction"
    },
    {
      id: 10,
      text: "Did a household member go to prison?",
      clinical: "Did a household member go to prison?",
      clientFriendly: "Did anyone in your home go to jail or prison?",
      category: "Household Dysfunction"
    }
  ];

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
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
    setAnswers({ ...answers, [currentQuestion]: 'skipped' });
    nextQuestion();
  };

  const calculateScore = () => {
    // ACE score: Count "Often" or "Sometimes" as 1 point each
    return Object.values(answers).filter(answer => 
      answer === 'Often' || answer === 'Sometimes'
    ).length;
  };

  const getScoreInterpretation = (score: number) => {
    if (score === 0) {
      return {
        result: 'No ACEs Reported',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'Client reported no adverse childhood experiences. Continue to provide supportive care and monitor for any emerging concerns.'
      };
    } else if (score >= 1 && score <= 3) {
      return {
        result: 'Low to Moderate ACE Score',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Client has some adverse childhood experiences. Consider trauma-informed care approaches and monitor for related health or mental health concerns.'
      };
    } else if (score >= 4 && score <= 6) {
      return {
        result: 'High ACE Score',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        recommendation: 'Client has significant adverse childhood experiences. Strongly recommend trauma-informed interventions, mental health support, and comprehensive care coordination.'
      };
    } else {
      return {
        result: 'Very High ACE Score',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        recommendation: 'Client has extensive adverse childhood experiences. Immediate trauma-informed care, mental health intervention, and comprehensive support services are strongly recommended. Consider referral to specialized trauma treatment.'
      };
    }
  };

  const completeAssessment = () => {
    setIsComplete(true);
  };

  const handlePrintAssessment = async () => {
    const score = calculateScore();
    const interpretation = getScoreInterpretation(score);
    
    // Use AI-powered print with interpretation
    await openPrintViewWithAI(
      'ACE',
      questions,
      answers,
      {
        clientName: 'Client Name', // This would come from props or context
        score,
        maxScore: questions.length,
        result: interpretation.result,
        notes,
        interpretation: interpretation.recommendation,
        riskLevel: score >= 4 ? 'high' : score >= 1 ? 'moderate' : 'low'
      }
    );
  };

  const handlePrintPaperForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const questionsHtml = questions.map((q, index) => `
      <div class="question-group">
        <p><strong>Question ${index + 1}:</strong> ${showClientFriendly ? q.clientFriendly : q.clinical}</p>
        <div class="options">
          <label><input type="radio" name="q${index}" value="never"> Never</label>
          <label><input type="radio" name="q${index}" value="rarely"> Rarely</label>
          <label><input type="radio" name="q${index}" value="sometimes"> Sometimes</label>
          <label><input type="radio" name="q${index}" value="often"> Often</label>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ACE Assessment - Paper Form</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .question-group { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .options { display: flex; gap: 15px; margin-top: 10px; }
          .options label { display: flex; align-items: center; gap: 5px; }
          .notes-section { margin-top: 30px; }
          textarea { width: 100%; min-height: 100px; border: 1px solid #ccc; padding: 10px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>ACE Assessment (Adverse Childhood Experiences)</h1>
        <p><strong>Instructions:</strong> Please answer each question based on your first 18 years of life.</p>
        ${questionsHtml}
        <div class="notes-section">
          <h2>Notes:</h2>
          <textarea readonly>${notes}</textarea>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const score = calculateScore();
  const interpretation = getScoreInterpretation(score);
  const progress = ((currentQuestion + 1) / questions.length) * 100;

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
              assessmentType="ace"
              assessmentName="ACE Assessment"
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
              assessmentType="ace"
              assessmentName="ACE Assessment"
              clientName="Client Name"
              compact={true}
              showPrint={false}
              showShare={false}
              showDownload={false}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">ACE Assessment</h1>
          <p className="text-sm sm:text-base text-slate-600 break-words">Adverse Childhood Experiences Questionnaire</p>
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
              {questions[currentQuestion].category}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Question Text */}
          <div className="bg-slate-50 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                {showClientFriendly ? 'Client-Friendly Version' : 'Clinical Version'}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClientFriendly(!showClientFriendly)}
                className="flex items-center gap-2 text-xs sm:text-sm self-start"
              >
                {showClientFriendly ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="hidden sm:inline">{showClientFriendly ? 'Show Clinical' : 'Show Client-Friendly'}</span>
                <span className="sm:hidden">{showClientFriendly ? 'Clinical' : 'Client-Friendly'}</span>
              </Button>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-slate-700 leading-relaxed break-words">
              {showClientFriendly ? questions[currentQuestion].clientFriendly : questions[currentQuestion].clinical}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm sm:text-base text-slate-900">Response Options:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['Never', 'Rarely', 'Sometimes', 'Often'].map((option) => (
                <Button
                  key={option}
                  variant={answers[currentQuestion] === option ? "default" : "outline"}
                  className={`p-3 sm:p-4 text-left justify-start text-sm sm:text-base ${
                    answers[currentQuestion] === option 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-slate-50'
                  }`}
                  onClick={() => handleAnswer(option)}
                >
                  {answers[currentQuestion] === option && (
                    <Check className="h-4 w-4 mr-2 flex-shrink-0" />
                  )}
                  <span className="break-words">{option}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="font-medium text-sm sm:text-base text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">Personal Notes</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 mb-3 break-words">
              Add qualitative context, observations, or client quotes here. Remember to create a safe, non-judgmental environment.
            </p>
            <Textarea
              placeholder="Type your notes here..."
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
                <p className="text-xs sm:text-sm font-medium text-slate-600">ACE Score</p>
                <p className={`text-xl sm:text-2xl font-bold ${interpretation.color}`}>{score}/{questions.length}</p>
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
            <div className="pt-4 border-t border-slate-200 bg-blue-50 p-4 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Understanding ACE Scores:</p>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>ACE Score of 0: No adverse childhood experiences reported</li>
                <li>ACE Score of 1-3: Some adverse experiences; may benefit from support</li>
                <li>ACE Score of 4+: Significant adversity; trauma-informed care recommended</li>
                <li>Higher scores correlate with increased risk for health and mental health challenges</li>
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
              disabled={!answers[currentQuestion]}
              className="bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              Next
            </Button>
          )}
          
          {/* Share blank assessment option */}
          {!isComplete && (
            <AssessmentActions
              assessmentType="ace"
              assessmentName="ACE Assessment"
              clientName="Client Name" // This would come from props
              compact={true}
              showPrint={false}
              showDownload={false}
            />
          )}
          
          {isComplete && (
            <AssessmentActions
              assessmentData={printData}
              onPrint={handlePrintAssessment}
              assessmentType="ace"
              assessmentName="ACE Assessment"
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

      {/* AI Loading Modal */}
      {aiLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Generating AI Interpretation</h3>
            <p className="text-slate-600">
              Our AI is analyzing the assessment results to provide comprehensive clinical insights. This may take a moment...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AceAssessment;
