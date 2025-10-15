
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check, Star, User, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
}

const PlanSelection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPlans();
  }, [user, navigate]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return;
      }

      const formattedPlans = data.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        description: plan.description,
        features: Array.isArray(plan.features) 
          ? plan.features.filter(f => typeof f === 'string') as string[]
          : []
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = async (planId: string, planPrice: number) => {
    if (!user) return;

    setSelectedPlan(planId);

    try {
      // For free plan, create subscription directly
      if (planPrice === 0) {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
          });

        if (error) {
          console.error('Error creating free subscription:', error);
          return;
        }

        navigate('/');
      } else {
        // For premium plan, redirect to payment setup (to be implemented with Stripe)
        alert('Provider Premium subscription setup will be available soon! For now, you can use the free plan.');
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-900">Choose Your Plan</h1>
          <p className="text-xl text-slate-600">Access agency information, referrals, and community resources</p>
          <div className="flex justify-center">
            <Button variant="outline" onClick={signOut} className="text-sm">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative transition-all duration-200 hover:shadow-lg ${
              plan.price > 0 ? 'border-primary shadow-md' : ''
            }`}>
              {plan.price > 0 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Best for Providers
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {plan.price > 0 ? (
                    <Users className="h-12 w-12 text-primary" />
                  ) : (
                    <User className="h-12 w-12 text-slate-600" />
                  )}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-primary">
                  ${plan.price}
                  <span className="text-sm text-slate-600 font-normal">/month</span>
                </div>
                <p className="text-slate-600">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handlePlanSelect(plan.id, plan.price)}
                  disabled={selectedPlan === plan.id}
                  className={`w-full ${
                    plan.price > 0 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {selectedPlan === plan.id ? 'Processing...' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;
