
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ResourcesHeader = () => {
  return (
    <header className="trauma-safe-card p-6">
      <h1 className="provider-focus-header text-3xl mb-2">Resource Library</h1>
      <p className="text-slate-600">Evidence-based resources for trauma-informed practice</p>
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <AlertTriangle className="inline h-4 w-4 mr-1" />
          All links have been updated and verified. If you encounter any issues, please contact support.
        </p>
      </div>
    </header>
  );
};

export default ResourcesHeader;
