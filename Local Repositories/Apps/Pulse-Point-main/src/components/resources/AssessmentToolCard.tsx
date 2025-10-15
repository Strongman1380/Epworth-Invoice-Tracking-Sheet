
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface AssessmentTool {
  name: string;
  description: string;
  link: string;
  notes: string;
}

interface AssessmentToolCardProps {
  tool: AssessmentTool;
  onView: (url: string, title: string) => void;
  getCostBadgeColor: (notes: string) => string;
}

const AssessmentToolCard = ({ tool, onView, getCostBadgeColor }: AssessmentToolCardProps) => {
  return (
    <div className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors gentle-interaction">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-slate-900">{tool.name}</h4>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCostBadgeColor(tool.notes)}`}>
          {tool.notes}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-3">{tool.description}</p>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onView(tool.link, tool.name)}
          className="gentle-interaction border-trauma-gentle"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Access Tool
        </Button>
        <span className="text-xs text-slate-500 flex items-center">
          Links verified - if broken, please contact support
        </span>
      </div>
    </div>
  );
};

export default AssessmentToolCard;
