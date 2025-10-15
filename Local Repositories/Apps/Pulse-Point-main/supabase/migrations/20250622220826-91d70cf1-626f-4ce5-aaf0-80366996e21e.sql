
-- Update the free plan to be for basic consumers, not agencies
UPDATE public.subscription_plans 
SET 
  name = 'Free with Ads',
  description = 'Basic consumer access with advertisements',
  features = '["Basic information", "Contact details", "Advertisement supported", "Limited access"]'
WHERE price = 0.00;
