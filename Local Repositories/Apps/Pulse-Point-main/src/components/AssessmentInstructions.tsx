import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, AlertTriangle, Target, Users, Clock, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { AssessmentInstructions } from '../data/assessmentInstructions';

interface AssessmentInstructionsProps {
  instructions: AssessmentInstructions;
  onProceed: () => void;
  showProceedButton?: boolean;
}

const AssessmentInstructionsComponent: React.FC<AssessmentInstructionsProps> = ({ 
  instructions, 
  onProceed, 
  showProceedButton = true 
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purpose: true,
    administration: false,
    instructions: false,
    scoring: false,
    safety: false,
    followUp: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
      case 'moderate': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'severe': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{instructions.name}</h1>
        <p className="text-base sm:text-lg text-slate-600">Instructions & Interpretation Guide</p>
      </div>

      {/* Purpose */}
      <Card>
        <Collapsible open={expandedSections.purpose} onOpenChange={() => toggleSection('purpose')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                  <span className="break-words">Purpose & Overview</span>
                </CardTitle>
                {expandedSections.purpose ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="px-4 sm:px-6">
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed break-words">{instructions.purpose}</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                  <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words"><strong>Time:</strong> {instructions.administration.timeframe}</span>
                </div>
                <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600">
                  <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words"><strong>Setting:</strong> {instructions.administration.setting.split(',')[0]}</span>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Administration Guidelines */}
      <Card>
        <Collapsible open={expandedSections.administration} onOpenChange={() => toggleSection('administration')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                  <span className="break-words">Administration Guidelines</span>
                </CardTitle>
                {expandedSections.administration ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div>
                <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3">General Guidelines</h4>
                <ul className="space-y-2">
                  {instructions.administration.administeringGuidelines.map((guideline, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-slate-700 break-words">{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-sm sm:text-base text-blue-900 mb-3">Trauma-Informed Considerations</h4>
                <ul className="space-y-2">
                  {instructions.administration.traumaInformed.map((consideration, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-blue-800 break-words">{consideration}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Step-by-Step Instructions */}
      <Card>
        <Collapsible open={expandedSections.instructions} onOpenChange={() => toggleSection('instructions')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0" />
                  <span className="break-words">Step-by-Step Instructions</span>
                </CardTitle>
                {expandedSections.instructions ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div className="grid gap-6">
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3 text-green-700">Before Starting</h4>
                  <ul className="space-y-2">
                    {instructions.instructions.beforeStarting.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3">
                        <span className="bg-green-100 text-green-700 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-700 break-words">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3 text-blue-700">During Assessment</h4>
                  <ul className="space-y-2">
                    {instructions.instructions.duringAssessment.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-700 break-words">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3 text-purple-700">After Completion</h4>
                  <ul className="space-y-2">
                    {instructions.instructions.afterCompletion.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3">
                        <span className="bg-purple-100 text-purple-700 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-700 break-words">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Scoring & Interpretation */}
      <Card>
        <Collapsible open={expandedSections.scoring} onOpenChange={() => toggleSection('scoring')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 flex-shrink-0" />
                  <span className="break-words">Scoring & Interpretation</span>
                </CardTitle>
                {expandedSections.scoring ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div>
                <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3">Scoring Method</h4>
                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg break-words">{instructions.scoring.method}</p>
              </div>

              <div>
                <h4 className="font-semibold text-sm sm:text-base text-slate-900 mb-3">Score Interpretation</h4>
                <div className="space-y-3">
                  {instructions.scoring.interpretation.ranges.map((range, index) => (
                    <div key={index} className={`border rounded-lg p-3 sm:p-4 ${getLevelColor(range.level)}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1">
                        <span className="font-semibold text-xs sm:text-sm break-words">Score Range: {range.range}</span>
                        <span className="text-xs font-medium uppercase tracking-wide">{range.level} Risk</span>
                      </div>
                      <p className="font-medium mb-2 text-xs sm:text-sm break-words">{range.interpretation}</p>
                      <p className="text-xs break-words">{range.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-sm sm:text-base text-amber-900 mb-3">Clinical Notes</h4>
                <ul className="space-y-1">
                  {instructions.scoring.clinicalNotes.map((note, index) => (
                    <li key={index} className="text-amber-800 text-xs sm:text-sm break-words">• {note}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Safety Considerations */}
      <Card>
        <Collapsible open={expandedSections.safety} onOpenChange={() => toggleSection('safety')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0" />
                  <span className="break-words">Safety Considerations</span>
                </CardTitle>
                {expandedSections.safety ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="px-4 sm:px-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <ul className="space-y-2">
                  {instructions.safetyConsiderations.map((consideration, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-red-800 break-words">{consideration}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Follow-up Actions */}
      <Card>
        <Collapsible open={expandedSections.followUp} onOpenChange={() => toggleSection('followUp')}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                  <span className="break-words">Follow-up Actions</span>
                </CardTitle>
                {expandedSections.followUp ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="px-4 sm:px-6">
              <ul className="space-y-2">
                {instructions.followUpActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-slate-700 break-words">{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Action Buttons */}
      {showProceedButton && (
        <div className="flex justify-center pt-6 px-4">
          <Button 
            onClick={onProceed}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-3 text-sm sm:text-base w-full sm:w-auto"
          >
            Begin Assessment
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssessmentInstructionsComponent;