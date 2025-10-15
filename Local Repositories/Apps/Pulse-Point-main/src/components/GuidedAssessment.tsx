
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Heart, Shield, X, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import PcPtsd5Assessment from './PcPtsd5Assessment';
import AceAssessment from './AceAssessment';
import TsqAssessment from './TsqAssessment';
import Pcl5Assessment from './Pcl5Assessment';
import BtqAssessment from './BtqAssessment';
import CtsqAssessment from './CtsqAssessment';
import Lec5Assessment from './Lec5Assessment';
import ManualAssessmentEntry from './ManualAssessmentEntry';
import ShareAssessment from './ShareAssessment';

const GuidedAssessment = () => {
  const { toolId, clientId } = useParams();
  const navigate = useNavigate();
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Get assessment name based on toolId
  const getAssessmentName = (toolId: string) => {
    const assessmentNames: Record<string, string> = {
      'pc-ptsd-5': 'PC-PTSD-5',
      'ace': 'ACE Questionnaire',
      'tsq': 'Trauma Screening Questionnaire',
      'btq': 'BTQ Assessment',
      'ctsq': 'CTSQ Assessment',
      'pcl5': 'PCL-5 Assessment',
      'lec5': 'LEC-5 Assessment'
    };
    return assessmentNames[toolId || ''] || 'Assessment';
  };

  // Get client name (in real app, this would come from API)
  const getClientName = (clientId: string) => {
    const clientNames: Record<string, string> = {
      '1': 'Sarah Johnson',
      '2': 'Michael Chen',
      '3': 'Emily Rodriguez',
      '4': 'David Thompson'
    };
    return clientNames[clientId || ''] || 'Client';
  };

  const handleQuitAssessment = () => {
    navigate('/assessments');
  };

  const renderAssessment = () => {
    // Handle manual entry for proprietary tools
    if (clientId === 'manual-entry') {
      return <ManualAssessmentEntry />;
    }

    // Handle integrated assessment tools
    switch (toolId) {
      case 'pc-ptsd-5':
        return <PcPtsd5Assessment />;
      case 'ace':
        return <AceAssessment />;
      case 'tsq':
        return <TsqAssessment />;
      case 'btq':
        return <BtqAssessment />;
      case 'ctsq':
        return <CtsqAssessment />;
      case 'pcl5':
      case 'pcl-5':
        return <Pcl5Assessment />;
      case 'lec5':
      case 'lec-5':
        return <Lec5Assessment />;
      default:
        return <AceAssessment />; // Default fallback
    }
  };

  // Add share button if we have valid toolId and clientId
  const shouldShowShareButton = toolId && clientId && clientId !== 'manual-entry';

  return (
    <div className="min-h-screen trauma-gradient">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Trauma-Informed Header */}
        <div className="trauma-safe-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="provider-focus-header text-2xl">Safe Assessment Environment</h1>
                <p className="text-slate-600 mt-1">Trauma-informed care in every interaction</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Quit Assessment Button */}
              <Button 
                variant="outline" 
                className="gentle-interaction flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleQuitAssessment}
              >
                <X className="h-4 w-4" />
                Quit Assessment
              </Button>

              {/* Enhanced Share Button */}
              {shouldShowShareButton && (
                <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gentle-interaction flex items-center gap-2 border-trauma-gentle">
                      <Share2 className="h-4 w-4" />
                      Share Safely for Data Collection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl trauma-safe-card border-0">
                    <DialogHeader className="space-y-3">
                      <DialogTitle className="provider-focus-header text-xl flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Secure Assessment Sharing
                      </DialogTitle>
                      <p className="text-sm text-slate-600">
                        Share this assessment securely with your client for remote completion
                      </p>
                    </DialogHeader>
                    <ShareAssessment
                      assessmentName={getAssessmentName(toolId!)}
                      clientName={getClientName(clientId!)}
                      assessmentId={`${toolId}-${clientId}-${Date.now()}`}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Content with Enhanced Trauma-Informed Design */}
        <div className="space-y-6">
          {renderAssessment()}
        </div>

        {/* Provider Support Footer */}
        <div className="trauma-safe-card p-6">
          <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span>Trauma-Informed Design</span>
            </div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <span>Provider-Focused Tools</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedAssessment;
