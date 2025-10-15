import React, { useState } from 'react';
import { FileText, Clock, AlertCircle, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from './ui/alert';

const AssessmentLibrary = () => {
  const navigate = useNavigate();
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const availableAssessments = [
    {
      id: 'ace',
      name: 'ACE Questionnaire',
      fullName: 'Adverse Childhood Experiences',
      description: 'Screens for childhood trauma and adverse experiences that may impact adult health and behavior.',
      questions: 10,
      timeEstimate: '5-10 minutes',
      category: 'Childhood Trauma',
      component: 'AceAssessment'
    },
    {
      id: 'pcl5',
      name: 'PCL-5',
      fullName: 'PTSD Checklist for DSM-5',
      description: 'Assesses the 20 DSM-5 symptoms of PTSD. Can be used to screen or monitor symptoms.',
      questions: 20,
      timeEstimate: '10-15 minutes',
      category: 'PTSD Assessment',
      component: 'Pcl5Assessment'
    },
    {
      id: 'pc-ptsd-5',
      name: 'PC-PTSD-5',
      fullName: 'Primary Care PTSD Screen',
      description: 'Brief, 5-item screening instrument designed to identify individuals who may have probable PTSD.',
      questions: 6,
      timeEstimate: '3-5 minutes',
      category: 'PTSD Screening',
      component: 'PcPtsd5Assessment'
    },
    {
      id: 'tsq',
      name: 'TSQ',
      fullName: 'Trauma Screening Questionnaire',
      description: 'Brief 10-item screening instrument for PTSD symptoms following traumatic events.',
      questions: 10,
      timeEstimate: '5 minutes',
      category: 'PTSD Screening',
      component: 'TsqAssessment'
    },
    {
      id: 'cd-risc-10',
      name: 'CD-RISC-10',
      fullName: 'Connor-Davidson Resilience Scale',
      description: 'Measures stress-coping ability and resilience. Assesses positive adaptation in the face of adversity.',
      questions: 10,
      timeEstimate: '5 minutes',
      category: 'Resilience',
      component: 'CdRisc10Assessment'
    },
    {
      id: 'phq-9',
      name: 'PHQ-9',
      fullName: 'Patient Health Questionnaire',
      description: 'Screens for depression severity. Used for diagnosis, monitoring treatment, and measuring outcomes.',
      questions: 9,
      timeEstimate: '5-10 minutes',
      category: 'Depression',
      component: 'Phq9Assessment'
    },
    {
      id: 'gad-7',
      name: 'GAD-7',
      fullName: 'Generalized Anxiety Disorder Scale',
      description: 'Screens for generalized anxiety disorder. Assesses anxiety symptom severity over the past two weeks.',
      questions: 7,
      timeEstimate: '5 minutes',
      category: 'Anxiety',
      component: 'Gad7Assessment'
    },
    {
      id: 'ies-r',
      name: 'IES-R',
      fullName: 'Impact of Event Scale - Revised',
      description: 'Measures subjective distress caused by traumatic events. Assesses intrusion, avoidance, and hyperarousal symptoms.',
      questions: 22,
      timeEstimate: '10-15 minutes',
      category: 'PTSD Assessment',
      component: 'IesrAssessment'
    }
  ];

  const handleStartAssessment = (assessmentId: string) => {
    // Navigate to the specific assessment component
    navigate(`/assessment/${assessmentId}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Compact Privacy Notice */}
      <Alert className="bg-blue-50 border-blue-200 cursor-pointer" onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}>
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 flex items-center justify-between">
          <div>
            <strong>🔒 Privacy First:</strong> Your data stays private – automatically cleared when you close this window.
            {!showPrivacyDetails && (
              <span className="text-blue-600 ml-2 text-sm underline">Learn more</span>
            )}
          </div>
          {showPrivacyDetails ? (
            <ChevronUp className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
          )}
        </AlertDescription>
      </Alert>

      {/* Privacy Details - Collapsible */}
      {showPrivacyDetails && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 pb-4">
            <div className="space-y-3 text-sm text-blue-900">
              <p className="font-semibold">How We Protect Your Privacy:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span><strong>No database storage</strong> – Nothing is saved to our servers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span><strong>Session-only data</strong> – Stored only in your browser's temporary memory</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">✓</span>
                  <span><strong>Auto-clear on close</strong> – All data automatically erased when you close the window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span><strong>Print before closing</strong> – Download or print your results before exiting</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Assessment Tools</h1>
        <p className="text-slate-600">
          Select an assessment to begin. Complete the questions, then print or download your results.
        </p>
      </div>

      {/* How It Works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-semibold">1</div>
            <p><strong>Choose an assessment</strong> from the list below based on your needs</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-semibold">2</div>
            <p><strong>Complete the questions</strong> honestly and thoughtfully</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-semibold">3</div>
            <p><strong>Review your results</strong> and print or download the report immediately</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-semibold">⚠️</div>
            <p><strong className="text-amber-700">Important:</strong> Data is NOT saved. Once you close this window, all information will be lost.</p>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableAssessments.map((assessment) => (
          <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{assessment.name}</CardTitle>
                  <p className="text-sm text-slate-600">{assessment.fullName}</p>
                </div>
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">{assessment.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{assessment.questions} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{assessment.timeEstimate}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {assessment.category}
                </span>
              </div>

              <Button 
                onClick={() => handleStartAssessment(assessment.id)}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Notice */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex gap-2">
              <Printer className="h-5 w-5 text-slate-600 flex-shrink-0" />
              <Download className="h-5 w-5 text-slate-600 flex-shrink-0" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-900">Remember to Save Your Results</p>
              <p className="text-sm text-slate-600">
                After completing an assessment, use the Print or Download options to save your results. 
                There is no database storage - your privacy is protected by design.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentLibrary;
