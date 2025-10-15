
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const EmergencyProtocols = () => {
  return (
    <Card className="border-red-200 bg-red-50 trauma-safe-card">
      <CardHeader>
        <CardTitle className="text-xl text-red-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Emergency Response Protocols
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-red-800">
          <div className="p-4 bg-red-100 rounded-lg">
            <h4 className="font-semibold mb-2">If client expresses suicidal ideation:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Assess immediate safety and intent</li>
              <li>• Contact emergency services if imminent danger</li>
              <li>• Involve supervisor or crisis team</li>
              <li>• Document thoroughly</li>
            </ul>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <h4 className="font-semibold mb-2">If client becomes severely distressed:</h4>
            <ul className="space-y-1 text-sm">
              <li>• Stop assessment immediately</li>
              <li>• Provide grounding techniques</li>
              <li>• Ensure client feels safe before leaving</li>
              <li>• Schedule follow-up within 24-48 hours</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyProtocols;
