import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  TrendingUp,
  Calendar,
  User,
  Download,
  Printer
} from 'lucide-react';
import { ManualAssessmentResult, ScoreInterpretation } from '../utils/clinicalScoring';

interface ManualAssessmentResultsProps {
  results: ManualAssessmentResult;
  onPrint?: () => void;
  onExport?: () => void;
  onClose?: () => void;
}

const ManualAssessmentResults: React.FC<ManualAssessmentResultsProps> = ({
  results,
  onPrint,
  onExport,
  onClose
}) => {
  // Risk level styling
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Very High': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low': return <CheckCircle className="h-4 w-4" />;
      case 'Moderate': return <AlertCircle className="h-4 w-4" />;
      case 'High': return <AlertTriangle className="h-4 w-4" />;
      case 'Very High': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Low': return 'text-green-700';
      case 'Low/Moderate': return 'text-green-600';
      case 'Moderate': return 'text-yellow-700';
      case 'Moderate/Severe': return 'text-orange-700';
      case 'Severe': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assessment Results</h1>
          <p className="text-slate-600 mt-1">{results.toolName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            className={`flex items-center gap-2 px-3 py-1 text-sm font-medium border ${getRiskBadgeVariant(results.overallRiskLevel)}`}
          >
            {getRiskIcon(results.overallRiskLevel)}
            Overall Risk: {results.overallRiskLevel}
          </Badge>
          
          <div className="flex gap-2">
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Administration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Administration Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-700">Date Administered</div>
              <div className="text-lg">{new Date(results.administrationDate).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Assessment Tool</div>
              <div className="text-lg">{results.toolName}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Overall Risk Level</div>
              <Badge 
                className={`flex items-center gap-2 px-2 py-1 text-sm font-medium border w-fit mt-1 ${getRiskBadgeVariant(results.overallRiskLevel)}`}
              >
                {getRiskIcon(results.overallRiskLevel)}
                {results.overallRiskLevel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.totalScore && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">Total Score</span>
                  <span className="text-2xl font-bold text-slate-900">{results.totalScore}</span>
                </div>
                {results.interpretations['Total Severity Score'] && (
                  <div className={`text-sm ${getCategoryColor(results.interpretations['Total Severity Score'].category)}`}>
                    {results.interpretations['Total Severity Score'].description}
                  </div>
                )}
              </div>
            )}
            
            <div className="grid gap-4">
              {Object.entries(results.scores).map(([subscale, score]) => {
                const interpretation = results.interpretations[subscale];
                if (!interpretation || subscale === 'Total Severity Score') return null;
                
                return (
                  <div key={subscale} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{subscale}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{score}</span>
                        <Badge 
                          className={`px-2 py-1 text-xs border ${getRiskBadgeVariant(interpretation.riskLevel)}`}
                        >
                          {interpretation.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{interpretation.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Interpretations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clinical Interpretations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(results.interpretations).map(([subscale, interpretation]) => (
              <div key={subscale} className="border-l-4 border-slate-200 pl-4">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-slate-900">{subscale}</h4>
                  <Badge 
                    className={`px-2 py-1 text-xs border ${getRiskBadgeVariant(interpretation.riskLevel)}`}
                  >
                    {interpretation.riskLevel} Risk
                  </Badge>
                </div>
                <p className="text-slate-700 mb-3">{interpretation.description}</p>
                
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Recommended Clinical Actions:</div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {interpretation.clinicalActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">•</span>
                        <span className={action.includes('IMMEDIATE') ? 'text-red-700 font-semibold' : ''}>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Clinical Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border-l-4 ${
            results.overallRiskLevel === 'Very High' ? 'bg-red-50 border-red-400' :
            results.overallRiskLevel === 'High' ? 'bg-orange-50 border-orange-400' :
            results.overallRiskLevel === 'Moderate' ? 'bg-yellow-50 border-yellow-400' :
            'bg-green-50 border-green-400'
          }`}>
            <div className="space-y-2">
              {results.clinicalRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span className={`text-slate-700 ${recommendation.includes('🚨') ? 'text-red-700 font-semibold text-base' : ''}`}>
                    {recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Notes */}
      {results.clinicalNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Clinical Notes & Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700 whitespace-pre-wrap">{results.clinicalNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-semibold">Important Clinical Disclaimer:</p>
            <p>This report is generated based on standardized scoring algorithms and clinical cutoffs from published literature. Clinical interpretation should always be conducted by qualified mental health professionals in the context of a comprehensive clinical assessment.</p>
            <p>These results are not intended as a substitute for clinical judgment and should be integrated with other assessment data, clinical observation, and professional expertise.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualAssessmentResults;