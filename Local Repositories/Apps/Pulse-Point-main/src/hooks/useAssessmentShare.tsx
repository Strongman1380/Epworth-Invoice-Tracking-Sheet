import { useState } from 'react';
import { AssessmentData } from '../components/AssessmentPrintView';

export interface ShareableAssessment {
  id: string;
  assessmentType: string;
  assessmentName: string;
  clientName?: string;
  clientId?: string;
  questions: Array<{
    id: number;
    text: string;
    category?: string;
    cluster?: string;
  }>;
  isBlank?: boolean; // For sharing blank assessments
}

export interface ShareOptions {
  includeInstructions?: boolean;
  allowClientSubmission?: boolean;
  expirationDays?: number;
  requireClientInfo?: boolean;
  sendNotification?: boolean;
  notificationEmail?: string;
  notificationSMS?: string;
}

export const useAssessmentShare = () => {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareableLink, setShareableLink] = useState<string>('');
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    includeInstructions: true,
    allowClientSubmission: true,
    expirationDays: 7,
    requireClientInfo: false,
    sendNotification: false
  });

  // Generate a unique assessment ID for sharing
  const generateAssessmentId = (): string => {
    return `assess-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Create shareable assessment link
  const generateShareLink = async (
    assessmentType: string,
    assessmentName: string,
    clientName?: string,
    clientId?: string,
    options?: Partial<ShareOptions>
  ): Promise<string> => {
    setIsGeneratingLink(true);
    
    try {
      const assessmentId = generateAssessmentId();
      const currentOptions = { ...shareOptions, ...options };
      
      // In a real app, this would save to backend
      const shareData: ShareableAssessment = {
        id: assessmentId,
        assessmentType,
        assessmentName,
        clientName,
        clientId,
        questions: getQuestionsByType(assessmentType),
        isBlank: true
      };
      
      // Store in localStorage for demo (in production, save to backend)
      localStorage.setItem(`shared-assessment-${assessmentId}`, JSON.stringify({
        ...shareData,
        options: currentOptions,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (currentOptions.expirationDays || 7) * 24 * 60 * 60 * 1000).toISOString()
      }));

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared-assessment/${assessmentId}`;
      
      setShareableLink(link);
      return link;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy link to clipboard
  const copyLinkToClipboard = async (link?: string): Promise<boolean> => {
    const linkToCopy = link || shareableLink;
    if (!linkToCopy) return false;

    try {
      await navigator.clipboard.writeText(linkToCopy);
      return true;
    } catch (error) {
      console.error('Failed to copy link:', error);
      return false;
    }
  };

  // Send assessment via email (placeholder - would integrate with email service)
  const sendAssessmentByEmail = async (
    email: string,
    link: string,
    assessmentName: string,
    clientName?: string,
    customMessage?: string
  ): Promise<boolean> => {
    // Placeholder for email sending
    console.log('Sending assessment by email:', {
      to: email,
      assessmentName,
      clientName,
      link,
      customMessage
    });
    
    // In production, this would call your email service
    return new Promise(resolve => setTimeout(() => resolve(true), 1000));
  };

  // Send assessment via SMS (placeholder - would integrate with SMS service)
  const sendAssessmentBySMS = async (
    phoneNumber: string,
    link: string,
    assessmentName: string,
    clientName?: string,
    customMessage?: string
  ): Promise<boolean> => {
    // Placeholder for SMS sending
    console.log('Sending assessment by SMS:', {
      to: phoneNumber,
      assessmentName,
      clientName,
      link,
      customMessage
    });
    
    // In production, this would call your SMS service
    return new Promise(resolve => setTimeout(() => resolve(true), 1000));
  };

  return {
    isGeneratingLink,
    shareableLink,
    shareOptions,
    setShareOptions,
    generateShareLink,
    copyLinkToClipboard,
    sendAssessmentByEmail,
    sendAssessmentBySMS
  };
};

// Helper function to get questions by assessment type
const getQuestionsByType = (assessmentType: string) => {
  switch (assessmentType.toLowerCase()) {
    case 'ace':
      return [
        { id: 1, text: "Emotional abuse question", category: "Emotional Abuse" },
        { id: 2, text: "Physical abuse question", category: "Physical Abuse" },
        // ... would include all ACE questions
      ];
    case 'pcl-5':
    case 'pcl5':
      return [
        { id: 1, text: "Repeated, disturbing memories", cluster: "Intrusion" },
        { id: 2, text: "Repeated, disturbing dreams", cluster: "Intrusion" },
        // ... would include all PCL-5 questions
      ];
    case 'pc-ptsd-5':
      return [
        { id: 1, text: "Have you ever experienced trauma?", category: "Trauma Exposure" },
        { id: 2, text: "Nightmares or unwanted memories", category: "Symptoms" },
        // ... would include all PC-PTSD-5 questions
      ];
    case 'tsq':
      return [
        { id: 1, text: "Upsetting thoughts or memories", category: "Symptoms" },
        { id: 2, text: "Upsetting dreams", category: "Symptoms" },
        // ... would include all TSQ questions
      ];
    default:
      return [];
  }
};

export { useAssessmentShare as default };
