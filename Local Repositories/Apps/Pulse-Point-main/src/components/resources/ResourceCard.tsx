
import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface Resource {
  title: string;
  description: string;
  type: string;
  downloadUrl: string | null;
  viewUrl: string;
}

interface ResourceCardProps {
  resource: Resource;
  onDownload: (url: string | null, title: string) => void;
  onView: (url: string, title: string) => void;
}

const ResourceCard = ({ resource, onDownload, onView }: ResourceCardProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors gentle-interaction">
      <div className="flex-1">
        <h4 className="font-medium text-slate-900">{resource.title}</h4>
        <p className="text-sm text-slate-600 mt-1">{resource.description}</p>
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-2">
          {resource.type}
        </span>
      </div>
      <div className="flex gap-2 ml-4">
        {resource.downloadUrl && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDownload(resource.downloadUrl, resource.title)}
            className="gentle-interaction border-trauma-gentle"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onView(resource.viewUrl, resource.title)}
          className="gentle-interaction border-trauma-gentle"
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
};

export default ResourceCard;
