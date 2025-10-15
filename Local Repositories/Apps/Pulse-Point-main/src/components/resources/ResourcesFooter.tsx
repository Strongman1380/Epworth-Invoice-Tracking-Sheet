
import React from 'react';
import { Heart, FileText } from 'lucide-react';

const ResourcesFooter = () => {
  return (
    <div className="trauma-safe-card p-6">
      <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          <span>Trauma-Informed Design</span>
        </div>
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Evidence-Based Tools</span>
        </div>
        <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        <span>Provider-Focused Resources</span>
      </div>
    </div>
  );
};

export default ResourcesFooter;
