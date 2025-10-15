import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Database, Users, FileText, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MockDataLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  const loadMockData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert sample clients
      const clientsData = [
        {
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: 'sarah.johnson@email.com',
          phone: '(555) 123-4567',
          date_of_birth: '1985-03-15',
          address: '123 Main St, Anytown, CA 90210',
          emergency_contact: 'John Johnson (Spouse)',
          emergency_phone: '(555) 123-4568',
          user_id: user.id
        },
        {
          first_name: 'Michael',
          last_name: 'Chen',
          email: 'michael.chen@email.com',
          phone: '(555) 234-5678',
          date_of_birth: '1990-07-22',
          address: '456 Oak Ave, Somewhere, NY 10001',
          emergency_contact: 'Lisa Chen (Sister)',
          emergency_phone: '(555) 234-5679',
          user_id: user.id
        },
        {
          first_name: 'Emily',
          last_name: 'Rodriguez',
          email: 'emily.rodriguez@email.com',
          phone: '(555) 345-6789',
          date_of_birth: '1988-11-08',
          address: '789 Pine Rd, Elsewhere, TX 75001',
          emergency_contact: 'Carlos Rodriguez (Brother)',
          emergency_phone: '(555) 345-6790',
          user_id: user.id
        },
        {
          first_name: 'David',
          last_name: 'Thompson',
          email: 'david.thompson@email.com',
          phone: '(555) 456-7890',
          date_of_birth: '1992-01-30',
          address: '321 Elm St, Hometown, FL 33101',
          emergency_contact: 'Mary Thompson (Mother)',
          emergency_phone: '(555) 456-7891',
          user_id: user.id
        },
        {
          first_name: 'Jessica',
          last_name: 'Wilson',
          email: 'jessica.wilson@email.com',
          phone: '(555) 567-8901',
          date_of_birth: '1987-09-12',
          address: '654 Maple Dr, Newtown, WA 98101',
          emergency_contact: 'Robert Wilson (Husband)',
          emergency_phone: '(555) 567-8902',
          user_id: user.id
        }
      ];

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .insert(clientsData)
        .select();

      if (clientsError) throw clientsError;

      if (clients && clients.length > 0) {
        // Insert sample assessment results
        const assessmentData = [
          // ACE Assessment for Sarah Johnson
          {
            client_id: clients[0].id,
            user_id: user.id,
            assessment_type: 'ACE',
            responses: {
              "1": "Sometimes",
              "2": "Never", 
              "3": "Rarely",
              "4": "Often"
            },
            score: 2,
            risk_level: 'moderate',
            notes: 'Client was cooperative during assessment. Showed some emotional distress when discussing family relationships. Recommend follow-up counseling.',
            completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          // PC-PTSD-5 for Sarah Johnson
          {
            client_id: clients[0].id,
            user_id: user.id,
            assessment_type: 'PC-PTSD-5',
            responses: {
              "trauma_exposure": true,
              "1": true,
              "2": true,
              "3": false,
              "4": true,
              "5": false
            },
            score: 3,
            risk_level: 'high',
            notes: 'Positive screen for PTSD. Client reported car accident 6 months ago. Experiencing nightmares and avoidance behaviors. Immediate referral to trauma specialist recommended.',
            completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          // ACE Assessment for Michael Chen
          {
            client_id: clients[1].id,
            user_id: user.id,
            assessment_type: 'ACE',
            responses: {
              "1": "Never",
              "2": "Never",
              "3": "Never", 
              "4": "Rarely"
            },
            score: 0,
            risk_level: 'low',
            notes: 'No significant adverse childhood experiences reported. Client appears to have strong family support system. Continue with standard care.',
            completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          // PC-PTSD-5 for Emily Rodriguez
          {
            client_id: clients[2].id,
            user_id: user.id,
            assessment_type: 'PC-PTSD-5',
            responses: {
              "trauma_exposure": true,
              "1": false,
              "2": true,
              "3": true,
              "4": false,
              "5": true
            },
            score: 3,
            risk_level: 'high',
            notes: 'Client disclosed domestic violence history. Currently in safe housing. Exhibiting hypervigilance and avoidance symptoms. Coordinating with social services.',
            completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          // TSQ Assessment for David Thompson
          {
            client_id: clients[3].id,
            user_id: user.id,
            assessment_type: 'TSQ',
            responses: {
              "1": true,
              "2": false,
              "3": true,
              "4": false,
              "5": true,
              "6": true,
              "7": false,
              "8": true,
              "9": false,
              "10": true
            },
            score: 6,
            risk_level: 'moderate',
            notes: 'Military veteran presenting with combat-related trauma symptoms. Reported difficulty sleeping and concentration issues. Referred to VA services.',
            completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
          },
          // Multiple assessments for Jessica Wilson
          {
            client_id: clients[4].id,
            user_id: user.id,
            assessment_type: 'ACE',
            responses: {
              "1": "Often",
              "2": "Sometimes",
              "3": "Often",
              "4": "Often"
            },
            score: 4,
            risk_level: 'high',
            notes: 'Initial assessment revealed significant childhood trauma history. Client expressed readiness to engage in trauma-focused therapy. Safety plan in place.',
            completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            client_id: clients[4].id,
            user_id: user.id,
            assessment_type: 'PC-PTSD-5',
            responses: {
              "trauma_exposure": true,
              "1": true,
              "2": true,
              "3": true,
              "4": true,
              "5": true
            },
            score: 5,
            risk_level: 'severe',
            notes: 'Follow-up assessment shows severe PTSD symptoms. Client has been consistent with therapy appointments. Medication consultation scheduled.',
            completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            client_id: clients[4].id,
            user_id: user.id,
            assessment_type: 'PC-PTSD-5',
            responses: {
              "trauma_exposure": true,
              "1": true,
              "2": false,
              "3": true,
              "4": false,
              "5": true
            },
            score: 3,
            risk_level: 'high',
            notes: 'Progress noted. Client reports reduced nightmares since starting EMDR therapy. Avoidance behaviors improving. Continue current treatment plan.',
            completed_at: new Date().toISOString()
          }
        ];

        const { error: assessmentError } = await supabase
          .from('assessment_results')
          .insert(assessmentData);

        if (assessmentError) throw assessmentError;
      }

      setIsLoaded(true);
      toast({
        title: "Mock Data Loaded Successfully",
        description: `Added ${clients.length} clients and 8 assessment results to your account.`,
      });

    } catch (error) {
      console.error('Error loading mock data:', error);
      toast({
        title: "Error Loading Mock Data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Database className="h-6 w-6 text-primary" />
          Load Sample Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-slate-600 space-y-2">
          <p>This will add sample data to your account including:</p>
          <ul className="space-y-1 ml-4">
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              5 sample clients with contact information
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              8 completed assessments (ACE, PC-PTSD-5, TSQ)
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Perfect for testing the print functionality and exploring the assessment system.
          </p>
        </div>

        {isLoaded ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Mock data loaded successfully!</span>
          </div>
        ) : (
          <Button 
            onClick={loadMockData} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Sample Data...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Load Sample Data
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-slate-500 text-center">
          Note: This data will be associated with your account and can be deleted later.
        </div>
      </CardContent>
    </Card>
  );
};

export default MockDataLoader;