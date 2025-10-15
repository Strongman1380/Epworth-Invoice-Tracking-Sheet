
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { assessmentGuidelines } from '../../data/resourcesData';

const AssessmentGuidelines = () => {
  return (
    <Card className="trauma-safe-card">
      <CardHeader>
        <CardTitle className="provider-focus-header text-xl">
          Assessment Administration Guidelines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {assessmentGuidelines.map((guide, index) => (
            <div key={index} className="border-l-4 border-primary pl-6">
              <h4 className="font-semibold text-slate-900 mb-3">{guide.tool}</h4>
              <ul className="space-y-2">
                {guide.guidelines.map((guideline, guideIndex) => (
                  <li key={guideIndex} className="flex items-start gap-2 text-slate-700">
                    <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>{guideline}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentGuidelines;
