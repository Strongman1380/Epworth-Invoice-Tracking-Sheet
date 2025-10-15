-- Insert sample clients (these will be tied to the current user when they log in)
-- Note: user_id will need to be set to the actual authenticated user's ID when they log in

INSERT INTO public.clients (id, user_id, first_name, last_name, email, phone, date_of_birth, address, emergency_contact, emergency_phone, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000000', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '(555) 123-4567', '1985-03-15', '123 Main St, Anytown, CA 90210', 'John Johnson (Spouse)', '(555) 123-4568', now(), now()),
('550e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000000', 'Michael', 'Chen', 'michael.chen@email.com', '(555) 234-5678', '1990-07-22', '456 Oak Ave, Somewhere, NY 10001', 'Lisa Chen (Sister)', '(555) 234-5679', now(), now()),
('550e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000000', 'Emily', 'Rodriguez', 'emily.rodriguez@email.com', '(555) 345-6789', '1988-11-08', '789 Pine Rd, Elsewhere, TX 75001', 'Carlos Rodriguez (Brother)', '(555) 345-6790', now(), now()),
('550e8400-e29b-41d4-a716-446655440004', '00000000-0000-0000-0000-000000000000', 'David', 'Thompson', 'david.thompson@email.com', '(555) 456-7890', '1992-01-30', '321 Elm St, Hometown, FL 33101', 'Mary Thompson (Mother)', '(555) 456-7891', now(), now()),
('550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'Jessica', 'Wilson', 'jessica.wilson@email.com', '(555) 567-8901', '1987-09-12', '654 Maple Dr, Newtown, WA 98101', 'Robert Wilson (Husband)', '(555) 567-8902', now(), now());

-- Insert sample assessment results
INSERT INTO public.assessment_results (id, client_id, user_id, assessment_type, responses, score, risk_level, notes, completed_at, created_at) VALUES
-- ACE Assessment for Sarah Johnson
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000000', 'ACE', 
'{"1": "Sometimes", "2": "Never", "3": "Rarely", "4": "Often"}', 
2, 'moderate', 
'Client was cooperative during assessment. Showed some emotional distress when discussing family relationships. Recommend follow-up counseling.', 
now() - interval '2 days', now() - interval '2 days'),

-- PC-PTSD-5 for Sarah Johnson
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000000', 'PC-PTSD-5', 
'{"trauma_exposure": true, "1": true, "2": true, "3": false, "4": true, "5": false}', 
3, 'high', 
'Positive screen for PTSD. Client reported car accident 6 months ago. Experiencing nightmares and avoidance behaviors. Immediate referral to trauma specialist recommended.', 
now() - interval '1 day', now() - interval '1 day'),

-- ACE Assessment for Michael Chen
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000000', 'ACE', 
'{"1": "Never", "2": "Never", "3": "Never", "4": "Rarely"}', 
0, 'low', 
'No significant adverse childhood experiences reported. Client appears to have strong family support system. Continue with standard care.', 
now() - interval '5 days', now() - interval '5 days'),

-- PC-PTSD-5 for Emily Rodriguez
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440003', '00000000-0000-0000-0000-000000000000', 'PC-PTSD-5', 
'{"trauma_exposure": true, "1": false, "2": true, "3": true, "4": false, "5": true}', 
3, 'high', 
'Client disclosed domestic violence history. Currently in safe housing. Exhibiting hypervigilance and avoidance symptoms. Coordinating with social services.', 
now() - interval '3 days', now() - interval '3 days'),

-- TSQ Assessment for David Thompson
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440004', '00000000-0000-0000-0000-000000000000', 'TSQ', 
'{"1": true, "2": false, "3": true, "4": false, "5": true, "6": true, "7": false, "8": true, "9": false, "10": true}', 
6, 'moderate', 
'Military veteran presenting with combat-related trauma symptoms. Reported difficulty sleeping and concentration issues. Referred to VA services.', 
now() - interval '4 days', now() - interval '4 days'),

-- Multiple assessments for Jessica Wilson to show progress tracking
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'ACE', 
'{"1": "Often", "2": "Sometimes", "3": "Often", "4": "Often"}', 
4, 'high', 
'Initial assessment revealed significant childhood trauma history. Client expressed readiness to engage in trauma-focused therapy. Safety plan in place.', 
now() - interval '14 days', now() - interval '14 days'),

('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'PC-PTSD-5', 
'{"trauma_exposure": true, "1": true, "2": true, "3": true, "4": true, "5": true}', 
5, 'severe', 
'Follow-up assessment shows severe PTSD symptoms. Client has been consistent with therapy appointments. Medication consultation scheduled.', 
now() - interval '7 days', now() - interval '7 days'),

('550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440005', '00000000-0000-0000-0000-000000000000', 'PC-PTSD-5', 
'{"trauma_exposure": true, "1": true, "2": false, "3": true, "4": false, "5": true}', 
3, 'high', 
'Progress noted. Client reports reduced nightmares since starting EMDR therapy. Avoidance behaviors improving. Continue current treatment plan.', 
now(), now());

-- Create a function to update user_id for mock data when a user logs in
CREATE OR REPLACE FUNCTION public.assign_mock_data_to_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update clients to belong to the current authenticated user
  UPDATE public.clients 
  SET user_id = auth.uid() 
  WHERE user_id = '00000000-0000-0000-0000-000000000000' 
    AND auth.uid() IS NOT NULL;
  
  -- Update assessment results to belong to the current authenticated user
  UPDATE public.assessment_results 
  SET user_id = auth.uid() 
  WHERE user_id = '00000000-0000-0000-0000-000000000000' 
    AND auth.uid() IS NOT NULL;
END;
$$;