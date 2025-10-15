
import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import AssessmentToolCard from './AssessmentToolCard';

interface AssessmentTool {
  name: string;
  description: string;
  link: string;
  notes: string;
}

interface AssessmentToolSectionProps {
  title: string;
  tools: AssessmentTool[];
  description: string;
  onView: (url: string, title: string) => void;
  getCostBadgeColor: (notes: string) => string;
}

const AssessmentToolSection = ({ title, tools, description, onView, getCostBadgeColor }: AssessmentToolSectionProps) => {
  return (
    <Card className="trauma-safe-card">
      <CardHeader>
        <CardTitle className="provider-focus-header text-xl flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          {title}
        </CardTitle>
        <p className="text-slate-600 text-sm">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tools.map((tool, index) => (
            <AssessmentToolCard
              key={index}
              tool={tool}
              onView={onView}
              getCostBadgeColor={getCostBadgeColor}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssessmentToolSection;
