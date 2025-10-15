
import React, { useState } from 'react';
import { ArrowLeft, FileText, Upload, Save, AlertTriangle, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useNavigate, useParams } from 'react-router-dom';
import { interpretManualAssessment, ManualAssessmentResult } from '../utils/clinicalScoring';
import ManualAssessmentResults from './ManualAssessmentResults';

const ManualAssessmentEntry = () => {
  const navigate = useNavigate();
  const { toolId } = useParams();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [administrationDate, setAdministrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<ManualAssessmentResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Define subscales for different tools
  const getToolConfig = (toolId: string) => {
    switch (toolId) {
      case 'tsi2':
        return {
          name: 'Trauma Symptom Inventory-2 (TSI-2)',
          validated: true,
          subscales: [
            'Anxious Arousal',
            'Depression',
            'Anger/Irritability',
            'Intrusive Experiences',
            'Defensive Avoidance',
            'Dissociation',
            'Sexual Concerns',
            'Dysfunctional Sexual Behavior',
            'Impaired Self-Reference',
            'Tension Reduction Behavior'
          ]
        };
      case 'caps5':
        return {
          name: 'Clinician-Administered PTSD Scale for DSM-5 (CAPS-5)',
          validated: true,
          subscales: [
            'Total Severity Score',
            'Criterion B (Intrusion) Score',
            'Criterion C (Avoidance) Score', 
            'Criterion D (Negative Cognitions) Score',
            'Criterion E (Alterations in Arousal) Score'
          ]
        };
      case 'ctq':
        return {
          name: 'Childhood Trauma Questionnaire (CTQ)',
          validated: true,
          subscales: [
            'Emotional Abuse',
            'Physical Abuse',
            'Sexual Abuse',
            'Emotional Neglect',
            'Physical Neglect'
          ]
        };
      case 'maysi2':
        return {
          name: 'Massachusetts Youth Screening Instrument-2 (MAYSI-2)',
          validated: true,
          subscales: [
            'Alcohol/Drug Use',
            'Angry-Irritable',
            'Depressed-Anxious',
            'Somatic Complaints',
            'Suicide Ideation',
            'Thought Disturbance',
            'Traumatic Experiences'
          ]
        };
      default:
        return {
          name: 'Manual Assessment Entry',
          validated: false,
          subscales: ['Total Score']
        };
    }
  };

  const toolConfig = getToolConfig(toolId || '');

  const handleScoreChange = (subscale: string, value: string) => {
    setScores({ ...scores, [subscale]: value });
  };

  const handleSave = () => {
    // Convert string scores to numbers
    const numericScores: Record<string, number> = {};
    Object.entries(scores).forEach(([key, value]) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        numericScores[key] = numValue;
      }
    });

    // Generate clinical interpretation
    const assessmentResults = interpretManualAssessment(
      toolId || '', 
      numericScores, 
      administrationDate,
      notes || undefined
    );
    
    // Here you would typically save to your backend
    console.log('Saving manual assessment:', {
      toolId,
      administrationDate,
      scores: numericScores,
      notes,
      results: assessmentResults
    });
    
    // Show results instead of navigating away
    setResults(assessmentResults);
    setShowResults(true);
  };

  const handleGeneratePreview = () => {
    // Convert string scores to numbers for preview
    const numericScores: Record<string, number> = {};
    Object.entries(scores).forEach(([key, value]) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        numericScores[key] = numValue;
      }
    });

    if (Object.keys(numericScores).length === 0) {
      alert('Please enter at least one score before generating preview.');
      return;
    }

    const assessmentResults = interpretManualAssessment(
      toolId || '', 
      numericScores, 
      administrationDate,
      notes || undefined
    );
    
    setResults(assessmentResults);
    setShowResults(true);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setResults(null);
  };

  const handleFinalSave = () => {
    // Navigate back after showing results
    navigate('/assessments');
  };

  // Show results view if results are available
  if (showResults && results) {
    return (
      <ManualAssessmentResults
        results={results}
        onClose={handleCloseResults}
        onPrint={() => window.print()}
        onExport={() => {
          // Export logic here
          const dataStr = JSON.stringify(results, null, 2);
          const dataBlob = new Blob([dataStr], {type: 'application/json'});
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${results.toolName}-results-${results.administrationDate}.json`;
          link.click();
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Manual Entry</h1>
            {toolConfig.validated && (
              <div className="flex items-center gap-1 text-green-600">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-sm font-medium">Validated Tool</span>
              </div>
            )}
          </div>
          <p className="text-slate-600">{toolConfig.name}</p>
        </div>
      </div>

      {/* Important Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Important Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-amber-800 space-y-2">
            <p>This tool requires separate purchase and/or specialized training for administration.</p>
            <p>Use this form to securely record scores from assessments administered offline.</p>
            <p><strong>Privacy Reminder:</strong> Do not upload any documents containing personally identifiable information.</p>
          </div>
        </CardContent>
      </Card>

      {/* Administration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Administration Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-2">
              Date Administered
            </label>
            <input
              type="date"
              id="date"
              value={administrationDate}
              onChange={(e) => setAdministrationDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Score Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Score Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toolConfig.subscales.map((subscale, index) => (
            <div key={subscale} className="space-y-2">
              <label htmlFor={`score-${index}`} className="block text-sm font-medium text-slate-700">
                {subscale}
              </label>
              <input
                type="number"
                id={`score-${index}`}
                value={scores[subscale] || ''}
                onChange={(e) => handleScoreChange(subscale, e.target.value)}
                placeholder="Enter score"
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clinical Notes & Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Record any relevant clinical observations, client quotes, contextual factors, or additional notes about the assessment administration..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Optional File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Optional: Upload Anonymized Score Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Upload a scan or photo of the completed score sheet</p>
            <p className="text-sm text-slate-500 mb-4">
              Ensure all personally identifiable information is removed or redacted
            </p>
            <Button variant="outline">
              Choose File
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline">
            Save as Draft
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleGeneratePreview}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Preview Results
          </Button>
        </div>
        
        <Button 
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save & Generate Report
        </Button>
      </div>
    </div>
  );
};

export default ManualAssessmentEntry;
