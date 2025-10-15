
-- Update the subscription plans to reflect the correct features and pricing
UPDATE public.subscription_plans 
SET 
  name = 'Free with Ads',
  price = 0.00,
  description = 'Basic agency information with advertisements',
  features = '["Agency information", "Contact details", "Advertisement supported", "Limited storage"]'
WHERE price = 0.00;

UPDATE public.subscription_plans 
SET 
  name = 'Provider Premium',
  price = 5.99,
  description = 'Full access without ads - perfect for providers',
  features = '["Agency information", "Contact details", "Limited storage for referrals and client profiles", "No ads", "Support", "Direct referral sending to agency", "Access to community resources"]'
WHERE price = 9.99;
