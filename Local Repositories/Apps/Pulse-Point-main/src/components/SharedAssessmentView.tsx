import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, Shield, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import AceAssessment from './AceAssessment';
import PcPtsd5Assessment from './PcPtsd5Assessment';
import TsqAssessment from './TsqAssessment';
import Pcl5Assessment from './Pcl5Assessment';
import ChatBot from './ChatBot';
import { ShareableAssessment } from '../hooks/useAssessmentShare';

interface SharedAssessmentData extends ShareableAssessment {
  options: {
    includeInstructions?: boolean;
    allowClientSubmission?: boolean;
    expirationDays?: number;
    requireClientInfo?: boolean;
  };
  createdAt: string;
  expiresAt: string;
}

const SharedAssessmentView = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [assessmentData, setAssessmentData] = useState<SharedAssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const loadSharedAssessment = async () => {
      try {
        setLoading(true);
        
        if (!shareId) {
          setError('No share ID provided');
          return;
        }

        // In a real application, this would fetch from your backend
        // For now, we'll check localStorage for the shared assessment
        const shareKey = `shared-assessment-${shareId}`;
        const storedData = localStorage.getItem(shareKey);
        
        if (!storedData) {
          setError('Assessment not found');
          return;
        }

        const sharedAssessment: SharedAssessmentData = JSON.parse(storedData);
        
        // Check if assessment has expired
        if (new Date() > new Date(sharedAssessment.expiresAt)) {
          setIsExpired(true);
          setError('This assessment link has expired');
          return;
        }
        
        setAssessmentData(sharedAssessment);
      } catch (err) {
        console.error('Error loading shared assessment:', err);
        setError('Failed to load shared assessment');
      } finally {
        setLoading(false);
      }
    };

    loadSharedAssessment();
  }, [shareId]);

  const renderAssessment = () => {
    if (!assessmentData) return null;

    // Render the appropriate assessment component based on type
    switch (assessmentData.assessmentType) {
      case 'ace':
        return <AceAssessment />;
      case 'pcl5':
        return <Pcl5Assessment />;
      case 'pcptsd5':
        return <PcPtsd5Assessment />;
      case 'tsq':
        return <TsqAssessment />;
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-600">
                Unknown assessment type: {assessmentData.assessmentType}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading shared assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Assessment Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {isExpired 
                ? 'This assessment link has expired and is no longer available.'
                : error || 'This shared assessment could not be found.'
              }
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Expires: {new Date(assessmentData.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Instructions Alert */}
          {assessmentData.options.includeInstructions && (
            <Alert className="mb-6">
              <Shield className="h-4 w-4" />
              <AlertTitle>Assessment Instructions</AlertTitle>
              <AlertDescription>
                Please complete this assessment honestly and to the best of your ability. 
                Your responses will be kept confidential and used to better understand your experiences.
                {assessmentData.options.requireClientInfo && (
                  <span className="block mt-2 font-medium">
                    Note: You may be asked to provide some basic information before completing the assessment.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Assessment Content */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-blue-800">
                  {assessmentData.assessmentName}
                </CardTitle>
                <p className="text-gray-600">
                  Shared Assessment
                </p>
              </CardHeader>
            </Card>

            {renderAssessment()}
          </div>
        </div>
      </div>
      <ChatBot />
    </div>
  );
};

export default SharedAssessmentView;
