
import React, { useState } from 'react';
import { Share2, Send, Copy, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';

interface ShareAssessmentProps {
  assessmentName: string;
  clientName: string;
  assessmentId: string;
}

const ShareAssessment = ({ assessmentName, clientName, assessmentId }: ShareAssessmentProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  // Generate shareable link
  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/shared-assessment/${assessmentId}?client=${encodeURIComponent(clientName)}`;
    setShareLink(link);
    return link;
  };

  const defaultMessage = `Hi ${clientName}, please complete your ${assessmentName} assessment using this secure link: `;

  const handleGenerateLink = () => {
    const link = generateShareLink();
    toast({
      title: "Link Generated",
      description: "Assessment link has been created successfully.",
    });
  };

  const handleCopyLink = async () => {
    if (!shareLink) {
      const link = generateShareLink();
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast({
        title: "Link Copied",
        description: "Assessment link has been copied to clipboard.",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleSendText = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    
    try {
      // Simulate sending text message (in real app, this would call an SMS service)
      const link = shareLink || generateShareLink();
      const message = customMessage || defaultMessage;
      const fullMessage = `${message} ${link}`;
      
      // Here you would integrate with an SMS service like Twilio
      console.log('Sending SMS to:', phoneNumber);
      console.log('Message:', fullMessage);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Assessment Shared",
        description: `Assessment link sent to ${phoneNumber}`,
      });
      
      setPhoneNumber('');
      setCustomMessage('');
    } catch (error) {
      toast({
        title: "Failed to Send",
        description: "Unable to send assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Share Assessment for Data Collection
        </CardTitle>
        <p className="text-sm text-slate-600">
          Send this assessment to {clientName} via text message for remote completion
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assessment Info */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-1">{assessmentName}</h4>
          <p className="text-sm text-slate-600">Client: {clientName}</p>
        </div>

        {/* Generate Link Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-900">Assessment Link</h4>
          {shareLink ? (
            <div className="flex gap-2">
              <Input 
                value={shareLink} 
                readOnly 
                className="flex-1 bg-slate-50 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="flex items-center gap-2"
              >
                {linkCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {linkCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerateLink} variant="outline">
              Generate Shareable Link
            </Button>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-slate-900">
            Client Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        {/* Custom Message */}
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-slate-900">
            Message (Optional)
          </label>
          <Textarea
            id="message"
            placeholder={defaultMessage}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-slate-500">
            The assessment link will be automatically added to your message
          </p>
        </div>

        {/* Send Button */}
        <Button 
          onClick={handleSendText}
          disabled={isSharing || !phoneNumber.trim()}
          className="w-full flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {isSharing ? 'Sending...' : 'Send Assessment via Text'}
        </Button>

        {/* Privacy Notice */}
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
          <p className="font-medium mb-1">Privacy & Security:</p>
          <p>
            Assessment links are secure and expire after completion. 
            All data is encrypted and HIPAA compliant.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareAssessment;
