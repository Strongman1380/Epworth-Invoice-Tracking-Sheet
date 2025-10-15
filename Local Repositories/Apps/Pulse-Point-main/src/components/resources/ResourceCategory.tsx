
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import ResourceCard from './ResourceCard';

interface Resource {
  title: string;
  description: string;
  type: string;
  downloadUrl: string | null;
  viewUrl: string;
}

interface ResourceCategoryProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  resources: Resource[];
  onDownload: (url: string | null, title: string) => void;
  onView: (url: string, title: string) => void;
}

const ResourceCategory = ({ title, icon: Icon, resources, onDownload, onView }: ResourceCategoryProps) => {
  return (
    <Card className="trauma-safe-card">
      <CardHeader>
        <CardTitle className="provider-focus-header text-xl flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {resources.map((resource, index) => (
            <ResourceCard
              key={index}
              resource={resource}
              onDownload={onDownload}
              onView={onView}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResourceCategory;
