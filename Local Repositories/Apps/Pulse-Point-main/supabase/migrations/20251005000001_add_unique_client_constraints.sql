-- Add unique constraints to ensure HIPAA-compliant client data isolation
-- This prevents duplicate client records and ensures data integrity

-- Add unique constraint for client identification within a user's practice
-- Ensures no duplicate clients based on name, DOB combination for each provider
CREATE UNIQUE INDEX idx_clients_unique_identity 
ON public.clients(user_id, LOWER(first_name), LOWER(last_name), date_of_birth)
WHERE date_of_birth IS NOT NULL;

-- Add unique constraint for email per user (if email is provided)
-- Prevents duplicate email addresses within a provider's client list
CREATE UNIQUE INDEX idx_clients_unique_email_per_user 
ON public.clients(user_id, LOWER(email))
WHERE email IS NOT NULL AND email != '';

-- Add unique constraint for phone per user (if phone is provided)
-- Prevents duplicate phone numbers within a provider's client list
CREATE UNIQUE INDEX idx_clients_unique_phone_per_user 
ON public.clients(user_id, phone)
WHERE phone IS NOT NULL AND phone != '';

-- Add composite index for better query performance on client searches
CREATE INDEX idx_clients_search 
ON public.clients(user_id, LOWER(first_name), LOWER(last_name));

-- Add index on updated_at for audit trail queries
CREATE INDEX idx_clients_updated_at 
ON public.clients(user_id, updated_at DESC);

-- Add index on assessment_results for better performance
CREATE INDEX idx_assessment_results_user_client 
ON public.assessment_results(user_id, client_id, completed_at DESC);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON INDEX idx_clients_unique_identity IS 'Ensures unique client identity per provider based on name and date of birth';
COMMENT ON INDEX idx_clients_unique_email_per_user IS 'Ensures unique email addresses per provider to prevent HIPAA violations';
COMMENT ON INDEX idx_clients_unique_phone_per_user IS 'Ensures unique phone numbers per provider to prevent data mixing';
