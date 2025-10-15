import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Printer, Download, FileText, Calendar, User, Shield, Award, Brain, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { AIInterpretation } from '../hooks/useAIInterpretation';

export interface AssessmentData {
  id: string;
  assessmentType: string;
  clientName?: string;
  clientId?: string;
  completedDate: string;
  answers: Record<string, any>;
  score?: number;
  maxScore?: number;
  result?: string;
  interpretation?: string;
  riskLevel?: string;
  notes?: string;
  questions: Array<{
    id: number;
    text: string;
    category?: string;
    answer?: string | boolean;
  }>;
  aiInterpretation?: AIInterpretation;
}

interface AssessmentPrintViewProps {
  assessmentData: AssessmentData;
  onClose?: () => void;
}

const AssessmentPrintView: React.FC<AssessmentPrintViewProps> = ({ 
  assessmentData, 
  onClose 
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, we'll trigger print dialog which allows saving as PDF
    // In a full implementation, you'd use a PDF library like jsPDF or react-pdf
    window.print();
  };

  const formatAnswer = (answer: any): string => {
    if (typeof answer === 'boolean') {
      return answer ? 'Yes' : 'No';
    }
    if (answer === 'skipped') {
      return 'Skipped';
    }
    return answer?.toString() || 'No answer provided';
  };

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'severe':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden during print */}
      <div className="print:hidden bg-trauma-gradient p-4 mb-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Assessment Report</h1>
              <p className="text-white/80 text-sm">Ready for printing or download</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {onClose && (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                Close
              </Button>
            )}
            <Button 
              onClick={handleDownloadPDF}
              className="bg-white text-primary hover:bg-white/90 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              onClick={handlePrint}
              className="bg-primary text-white hover:bg-primary/90 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-6xl mx-auto p-6 print:p-0 print:max-w-none">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6 print:mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full print:bg-gray-100">
                <Shield className="h-6 w-6 text-primary print:text-gray-600" />
              </div>
              <div>
                <h1 className="text-3xl print:text-2xl font-bold text-slate-900">
                  {assessmentData.assessmentType} Assessment Report
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(assessmentData.completedDate).toLocaleDateString()}
                  </div>
                  {assessmentData.clientName && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {assessmentData.clientName}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Validated Badge */}
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full print:bg-gray-100">
              <Award className="h-4 w-4 text-primary print:text-gray-600" />
              <span className="text-sm font-medium text-primary print:text-gray-600">
                Validated Tool
              </span>
            </div>
          </div>

          {/* Summary Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Assessment ID</p>
                <p className="text-lg font-mono">{assessmentData.id}</p>
              </div>
              {assessmentData.score !== undefined && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Score</p>
                  <p className="text-2xl font-bold text-primary">
                    {assessmentData.score}
                    {assessmentData.maxScore && `/${assessmentData.maxScore}`}
                  </p>
                </div>
              )}
              {assessmentData.riskLevel && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Risk Level</p>
                  <div className={`px-3 py-1 rounded-full border inline-block ${getRiskLevelColor(assessmentData.riskLevel)}`}>
                    <span className="text-sm font-medium capitalize">
                      {assessmentData.riskLevel}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Interpretation */}
          {(assessmentData.result || assessmentData.interpretation) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Clinical Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessmentData.result && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Result</p>
                    <p className="text-lg font-semibold">{assessmentData.result}</p>
                  </div>
                )}
                {assessmentData.interpretation && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Clinical Interpretation</p>
                    <p className="text-base leading-relaxed">{assessmentData.interpretation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI-Powered Clinical Interpretation */}
          {assessmentData.aiInterpretation && (
            <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 print:bg-white print:border-gray-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-100 print:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AI-Powered Clinical Interpretation</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Evidence-based analysis using {assessmentData.aiInterpretation.aiModel || 'GPT-4'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Summary */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:shadow-none">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Executive Summary
                  </h3>
                  <p className="text-base leading-relaxed text-slate-700">
                    {assessmentData.aiInterpretation.summary}
                  </p>
                </div>

                {/* Score Interpretation */}
                <div className="print:break-inside-avoid">
                  <h3 className="text-base font-semibold mb-2 text-slate-900">📊 Score Interpretation</h3>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-base leading-relaxed">{assessmentData.aiInterpretation.scoreInterpretation}</p>
                  </div>
                </div>

                {/* Clinical Significance */}
                <div className="print:break-inside-avoid">
                  <h3 className="text-base font-semibold mb-2 text-slate-900">⚠️ Clinical Significance</h3>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-5 w-5 ${
                          assessmentData.aiInterpretation.clinicalSignificance.level === 'severe' ? 'text-red-600' :
                          assessmentData.aiInterpretation.clinicalSignificance.level === 'moderate' ? 'text-orange-600' :
                          assessmentData.aiInterpretation.clinicalSignificance.level === 'mild' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-600">Severity Level</p>
                          <p className="font-semibold capitalize">{assessmentData.aiInterpretation.clinicalSignificance.level}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${
                          assessmentData.aiInterpretation.clinicalSignificance.urgency === 'immediate' ? 'text-red-600' :
                          assessmentData.aiInterpretation.clinicalSignificance.urgency === 'urgent' ? 'text-orange-600' :
                          assessmentData.aiInterpretation.clinicalSignificance.urgency === 'prompt' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-600">Urgency</p>
                          <p className="font-semibold capitalize">{assessmentData.aiInterpretation.clinicalSignificance.urgency}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-base leading-relaxed">{assessmentData.aiInterpretation.clinicalSignificance.explanation}</p>
                  </div>
                </div>

                {/* Symptom Patterns */}
                {assessmentData.aiInterpretation.symptomPatterns.length > 0 && (
                  <div className="print:break-inside-avoid">
                    <h3 className="text-base font-semibold mb-2 text-slate-900">🔍 Key Symptom Patterns</h3>
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                      <ul className="space-y-2">
                        {assessmentData.aiInterpretation.symptomPatterns.map((pattern, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-base">{pattern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Strengths and Resources */}
                {assessmentData.aiInterpretation.strengthsAndResources.length > 0 && (
                  <div className="print:break-inside-avoid">
                    <h3 className="text-base font-semibold mb-2 text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Strengths & Protective Factors
                    </h3>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 print:bg-white">
                      <ul className="space-y-2">
                        {assessmentData.aiInterpretation.strengthsAndResources.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-green-600 mt-1">✓</span>
                            <span className="text-base">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="print:break-inside-avoid">
                  <h3 className="text-base font-semibold mb-2 text-slate-900">💡 Clinical Recommendations</h3>
                  <div className="space-y-3">
                    {assessmentData.aiInterpretation.recommendations.immediate.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 print:bg-white print:border-gray-300">
                        <h4 className="font-semibold text-red-900 mb-2">Immediate Actions</h4>
                        <ul className="space-y-1">
                          {assessmentData.aiInterpretation.recommendations.immediate.map((rec, index) => (
                            <li key={index} className="text-base flex items-start gap-2">
                              <span className="text-red-600">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assessmentData.aiInterpretation.recommendations.shortTerm.length > 0 && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 print:bg-white print:border-gray-300">
                        <h4 className="font-semibold text-yellow-900 mb-2">Short-Term (1-2 weeks)</h4>
                        <ul className="space-y-1">
                          {assessmentData.aiInterpretation.recommendations.shortTerm.map((rec, index) => (
                            <li key={index} className="text-base flex items-start gap-2">
                              <span className="text-yellow-600">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assessmentData.aiInterpretation.recommendations.longTerm.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 print:bg-white print:border-gray-300">
                        <h4 className="font-semibold text-blue-900 mb-2">Long-Term Considerations</h4>
                        <ul className="space-y-1">
                          {assessmentData.aiInterpretation.recommendations.longTerm.map((rec, index) => (
                            <li key={index} className="text-base flex items-start gap-2">
                              <span className="text-blue-600">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Follow-up Plan */}
                <div className="print:break-inside-avoid">
                  <h3 className="text-base font-semibold mb-2 text-slate-900">📅 Follow-Up Plan</h3>
                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Timeline</p>
                      <p className="text-base">{assessmentData.aiInterpretation.followUp.timeline}</p>
                    </div>
                    {assessmentData.aiInterpretation.followUp.reassessmentTools.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Recommended Assessments</p>
                        <ul className="text-base">
                          {assessmentData.aiInterpretation.followUp.reassessmentTools.map((tool, index) => (
                            <li key={index}>• {tool}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assessmentData.aiInterpretation.followUp.monitoringFocus.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Monitoring Focus</p>
                        <ul className="text-base">
                          {assessmentData.aiInterpretation.followUp.monitoringFocus.map((focus, index) => (
                            <li key={index}>• {focus}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Differential Considerations */}
                {assessmentData.aiInterpretation.differentialConsiderations.length > 0 && (
                  <div className="print:break-inside-avoid">
                    <h3 className="text-base font-semibold mb-2 text-slate-900">🔬 Differential Considerations</h3>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 print:bg-white print:border-gray-300">
                      <ul className="space-y-2">
                        {assessmentData.aiInterpretation.differentialConsiderations.map((consideration, index) => (
                          <li key={index} className="text-base flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span>{consideration}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Clinical Notes */}
                {assessmentData.aiInterpretation.clinicalNotes && (
                  <div className="print:break-inside-avoid">
                    <h3 className="text-base font-semibold mb-2 text-slate-900">📋 Additional Clinical Notes</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-base leading-relaxed">{assessmentData.aiInterpretation.clinicalNotes}</p>
                    </div>
                  </div>
                )}

                {/* Assessment Information */}
                {assessmentData.aiInterpretation.assessmentInfo && (
                  <div className="mt-4 pt-4 border-t border-slate-200 print:break-inside-avoid">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Assessment Information</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p><strong>Tool:</strong> {assessmentData.aiInterpretation.assessmentInfo.name}</p>
                      <p><strong>Purpose:</strong> {assessmentData.aiInterpretation.assessmentInfo.purpose}</p>
                      <p><strong>Scoring Range:</strong> {assessmentData.aiInterpretation.assessmentInfo.scoringRange}</p>
                      <p><strong>Clinical Cutoff:</strong> {assessmentData.aiInterpretation.assessmentInfo.cutoffScore}</p>
                    </div>
                  </div>
                )}

                {/* AI Disclaimer */}
                <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-300 print:border-gray-400">
                  <p className="text-xs text-slate-600">
                    <strong>AI Interpretation Disclaimer:</strong> This interpretation was generated using artificial intelligence 
                    as a clinical decision support tool. It should be used in conjunction with professional clinical judgment and 
                    not as a replacement for comprehensive clinical assessment. Generated on {assessmentData.aiInterpretation.generatedAt ? 
                    new Date(assessmentData.aiInterpretation.generatedAt).toLocaleString() : new Date().toLocaleString()}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Questions and Answers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Questions and Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {assessmentData.questions.map((question, index) => (
              <div 
                key={question.id} 
                className="pb-4 border-b border-slate-100 last:border-b-0 print:break-inside-avoid"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-sm font-medium text-slate-500 mt-1 flex-shrink-0">
                        Q{index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-base text-slate-900 leading-relaxed">
                          {question.text}
                        </p>
                        {question.category && (
                          <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                            {question.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="sm:w-32 flex-shrink-0">
                    <p className="text-sm font-medium text-slate-600 mb-1">Response:</p>
                    <div className="px-3 py-2 bg-slate-50 rounded border">
                      <span className="font-medium text-slate-900">
                        {formatAnswer(question.answer)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clinical Notes */}
        {assessmentData.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {assessmentData.notes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 print:mt-6 print:pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-slate-600">
            <div>
              <p className="font-medium">Trauma-Informed Assessment Report</p>
              <p>Generated on {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p>HIPAA Compliant | Confidential</p>
              <p className="text-xs">This report contains protected health information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:text-2xl {
            font-size: 1.5rem !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
          .print\\:pt-4 {
            padding-top: 1rem !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default AssessmentPrintView;