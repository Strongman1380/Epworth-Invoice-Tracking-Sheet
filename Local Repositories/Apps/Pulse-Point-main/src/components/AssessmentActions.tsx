import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  Download,
  ExternalLink,
  Clock,
  Shield,
  Settings,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import PrintableAssessment from './PrintableAssessment';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from '../hooks/use-toast';
import { useAssessmentShare } from '../hooks/useAssessmentShare';
import { AssessmentData } from './AssessmentPrintView';

interface AssessmentActionsProps {
  // For completed assessments
  assessmentData?: AssessmentData;
  onPrint?: () => void;
  
  // For sharing blank assessments
  assessmentType?: 'ace' | 'pcl5' | 'pcptsd5' | 'tsq';
  assessmentName?: string;
  clientName?: string;
  clientId?: string;
  
  // UI options
  showPrint?: boolean;
  showShare?: boolean;
  showDownload?: boolean;
  compact?: boolean;
}

const AssessmentActions: React.FC<AssessmentActionsProps> = ({
  assessmentData,
  onPrint,
  assessmentType,
  assessmentName,
  clientName,
  clientId,
  showPrint = true,
  showShare = true,
  showDownload = true,
  compact = false
}) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPrintableDialog, setShowPrintableDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const { toast } = useToast();
  const {
    isGeneratingLink,
    shareableLink,
    shareOptions,
    setShareOptions,
    generateShareLink,
    copyLinkToClipboard,
    sendAssessmentByEmail,
    sendAssessmentBySMS
  } = useAssessmentShare();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    // Trigger print dialog which allows saving as PDF
    window.print();
  };

  const handlePrintPaper = (options: {
    includeInstructions: boolean;
    includeScoringGuide: boolean;
    clientName?: string;
  }) => {
    // Simple approach: generate a new window with the printable content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Unable to open print window. Please allow popups for this site.",
        variant: "destructive"
      });
      return;
    }

    // Write basic HTML structure
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${assessmentName} - Paper Form</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4; 
            }
            .no-print { 
              text-align: center; 
              margin: 20px 0; 
              border-top: 1px solid #ccc; 
              padding-top: 20px; 
            }
            @media print {
              .no-print { display: none; }
              body { margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div id="assessment-content">Loading...</div>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; margin-right: 10px;">Print This Form</button>
            <button onclick="window.close()" style="padding: 10px 20px;">Close Window</button>
          </div>
        </body>
      </html>
    `);

    // For now, close the document to render the buttons
    printWindow.document.close();
    
    // Focus the window
    printWindow.focus();

    setShowPrintableDialog(false);
    toast({
      title: "Paper Form Opened",
      description: "A new window has opened with the printable paper form. Use your browser's print function (Ctrl+P or Cmd+P) to print.",
    });
  };

  const handleGenerateLink = async () => {
    if (!assessmentType || !assessmentName) {
      toast({
        title: "Error",
        description: "Assessment type and name are required to generate share link.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateShareLink(assessmentType, assessmentName, clientName, clientId);
      toast({
        title: "Link Generated",
        description: "Shareable assessment link has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyLink = async () => {
    const success = await copyLinkToClipboard();
    if (success) {
      setLinkCopied(true);
      toast({
        title: "Link Copied",
        description: "Assessment link has been copied to clipboard.",
      });
      setTimeout(() => setLinkCopied(false), 3000);
    } else {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    if (!shareableLink) {
      await handleGenerateLink();
    }

    setIsSending(true);
    try {
      const success = await sendAssessmentByEmail(
        emailAddress,
        shareableLink,
        assessmentName || 'Assessment',
        clientName,
        customMessage
      );

      if (success) {
        toast({
          title: "Email Sent",
          description: `Assessment has been sent to ${emailAddress}`,
        });
        setEmailAddress('');
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number.",
        variant: "destructive"
      });
      return;
    }

    if (!shareableLink) {
      await handleGenerateLink();
    }

    setIsSending(true);
    try {
      const success = await sendAssessmentBySMS(
        phoneNumber,
        shareableLink,
        assessmentName || 'Assessment',
        clientName,
        customMessage
      );

      if (success) {
        toast({
          title: "SMS Sent",
          description: `Assessment has been sent to ${phoneNumber}`,
        });
        setPhoneNumber('');
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const defaultMessage = `Hi${clientName ? ` ${clientName}` : ''}, please complete your ${assessmentName || 'assessment'} using this secure link: `;

  if (compact) {
    return (
      <div className="flex gap-2">
        {showPrint && (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
        )}
        {showDownload && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        )}
        {showShare && assessmentType && (
          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        
        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Assessment
              </DialogTitle>
            </DialogHeader>
            {/* Dialog content will be rendered here - same as full version below */}
            <ShareDialogContent 
              assessmentName={assessmentName}
              clientName={clientName}
              shareableLink={shareableLink}
              isGeneratingLink={isGeneratingLink}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              emailAddress={emailAddress}
              setEmailAddress={setEmailAddress}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              customMessage={customMessage}
              setCustomMessage={setCustomMessage}
              defaultMessage={defaultMessage}
              linkCopied={linkCopied}
              isSending={isSending}
              shareOptions={shareOptions}
              setShareOptions={setShareOptions}
              onGenerateLink={handleGenerateLink}
              onCopyLink={handleCopyLink}
              onSendEmail={handleSendEmail}
              onSendSMS={handleSendSMS}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {showPrint && (
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Results
          </Button>
        )}
        
        {assessmentType && (
          <Button 
            variant="outline" 
            onClick={() => setShowPrintableDialog(true)} 
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Print Paper Form
          </Button>
        )}
        
        {showDownload && (
          <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
        
        {showShare && assessmentType && (
          <Button onClick={() => setShowShareDialog(true)} className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Assessment
          </Button>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Assessment: {assessmentName}
            </DialogTitle>
          </DialogHeader>
          
          <ShareDialogContent 
            assessmentName={assessmentName}
            clientName={clientName}
            shareableLink={shareableLink}
            isGeneratingLink={isGeneratingLink}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            emailAddress={emailAddress}
            setEmailAddress={setEmailAddress}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            customMessage={customMessage}
            setCustomMessage={setCustomMessage}
            defaultMessage={defaultMessage}
            linkCopied={linkCopied}
            isSending={isSending}
            shareOptions={shareOptions}
            setShareOptions={setShareOptions}
            onGenerateLink={handleGenerateLink}
            onCopyLink={handleCopyLink}
            onSendEmail={handleSendEmail}
            onSendSMS={handleSendSMS}
          />
        </DialogContent>
      </Dialog>

      {/* Printable Assessment Dialog */}
      <Dialog open={showPrintableDialog} onOpenChange={setShowPrintableDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paper Assessment Form: {assessmentName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <p className="font-medium mb-2">📝 Paper Assessment Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This creates a printable form that clients can complete on paper</li>
                <li>Includes all questions with checkboxes and answer spaces</li>
                <li>Professional formatting suitable for clinical use</li>
                <li>Can include scoring guide for clinician reference</li>
              </ul>
            </div>

            <PrintableAssessmentOptions 
              assessmentType={assessmentType}
              assessmentName={assessmentName}
              clientName={clientName}
              onPrint={(options) => handlePrintPaper(options)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate component for share dialog content to avoid duplication
const ShareDialogContent: React.FC<{
  assessmentName?: string;
  clientName?: string;
  shareableLink: string;
  isGeneratingLink: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  emailAddress: string;
  setEmailAddress: (email: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  customMessage: string;
  setCustomMessage: (message: string) => void;
  defaultMessage: string;
  linkCopied: boolean;
  isSending: boolean;
  shareOptions: any;
  setShareOptions: (options: any) => void;
  onGenerateLink: () => void;
  onCopyLink: () => void;
  onSendEmail: () => void;
  onSendSMS: () => void;
}> = ({
  assessmentName,
  clientName,
  shareableLink,
  isGeneratingLink,
  activeTab,
  setActiveTab,
  emailAddress,
  setEmailAddress,
  phoneNumber,
  setPhoneNumber,
  customMessage,
  setCustomMessage,
  defaultMessage,
  linkCopied,
  isSending,
  shareOptions,
  setShareOptions,
  onGenerateLink,
  onCopyLink,
  onSendEmail,
  onSendSMS
}) => {
  return (
    <div className="space-y-6">
      {/* Assessment Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h4 className="font-semibold">{assessmentName}</h4>
              {clientName && <p className="text-sm text-muted-foreground">For: {clientName}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Options Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="link">
            <ExternalLink className="h-4 w-4 mr-2" />
            Link
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Link Tab */}
        <TabsContent value="link" className="space-y-4">
          <div className="space-y-3">
            <Label>Shareable Link</Label>
            {!shareableLink ? (
              <Button 
                onClick={onGenerateLink} 
                disabled={isGeneratingLink}
                className="w-full"
              >
                {isGeneratingLink ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Generate Secure Link
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input 
                    value={shareableLink} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={onCopyLink}
                    className="flex items-center gap-2"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Link expires in {shareOptions.expirationDays} days
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="email-message">Custom Message (Optional)</Label>
              <Textarea
                id="email-message"
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={onSendEmail} 
              disabled={isSending || !emailAddress}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Assessment by Email
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="sms-message">Custom Message (Optional)</Label>
              <Textarea
                id="sms-message"
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={onSendSMS} 
              disabled={isSending || !phoneNumber}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Assessment by SMS
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Instructions</Label>
                <p className="text-xs text-muted-foreground">Show assessment instructions to client</p>
              </div>
              <Switch 
                checked={shareOptions.includeInstructions}
                onCheckedChange={(checked) => 
                  setShareOptions({...shareOptions, includeInstructions: checked})
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Submission</Label>
                <p className="text-xs text-muted-foreground">Client can submit completed assessment</p>
              </div>
              <Switch 
                checked={shareOptions.allowClientSubmission}
                onCheckedChange={(checked) => 
                  setShareOptions({...shareOptions, allowClientSubmission: checked})
                }
              />
            </div>

            <div>
              <Label>Link Expiration</Label>
              <Select 
                value={shareOptions.expirationDays.toString()}
                onValueChange={(value) => 
                  setShareOptions({...shareOptions, expirationDays: parseInt(value)})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Component for printable assessment options
const PrintableAssessmentOptions: React.FC<{
  assessmentType?: 'ace' | 'pcl5' | 'pcptsd5' | 'tsq';
  assessmentName?: string;
  clientName?: string;
  onPrint: (options: {
    includeInstructions: boolean;
    includeScoringGuide: boolean;
    clientName?: string;
  }) => void;
}> = ({ assessmentType, assessmentName, clientName, onPrint }) => {
  const [includeInstructions, setIncludeInstructions] = useState(true);
  const [includeScoringGuide, setIncludeScoringGuide] = useState(false);
  const [customClientName, setCustomClientName] = useState(clientName || '');

  const handlePrint = () => {
    onPrint({
      includeInstructions,
      includeScoringGuide,
      clientName: customClientName
    });
  };

  return (
    <div className="space-y-6">
      {/* Print Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Print Options</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="include-instructions" className="text-sm">
              Include Assessment Instructions
            </Label>
            <Switch
              id="include-instructions"
              checked={includeInstructions}
              onCheckedChange={setIncludeInstructions}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="include-scoring" className="text-sm">
              Include Scoring Guide (for clinicians)
            </Label>
            <Switch
              id="include-scoring"
              checked={includeScoringGuide}
              onCheckedChange={setIncludeScoringGuide}
            />
          </div>
        </div>
      </div>

      {/* Client Name Override */}
      <div className="space-y-2">
        <Label htmlFor="client-name" className="text-sm font-medium">
          Client Name (optional)
        </Label>
        <Input
          id="client-name"
          placeholder="Enter client name for form header"
          value={customClientName}
          onChange={(e) => setCustomClientName(e.target.value)}
        />
        <p className="text-xs text-gray-600">
          Leave blank to show a fill-in line on the printed form
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-sm mb-2">Form Preview:</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Assessment: {assessmentName}</li>
          <li>• Instructions: {includeInstructions ? 'Included' : 'Not included'}</li>
          <li>• Scoring Guide: {includeScoringGuide ? 'Included' : 'Not included'}</li>
          <li>• Client Name: {customClientName || 'Blank line for client to fill'}</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Generate Paper Form
        </Button>
        
        {assessmentType && (
          <div className="hidden">
            <PrintableAssessment
              assessmentType={assessmentType}
              clientName={customClientName}
              includeInstructions={includeInstructions}
              includeScoringGuide={includeScoringGuide}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentActions;
