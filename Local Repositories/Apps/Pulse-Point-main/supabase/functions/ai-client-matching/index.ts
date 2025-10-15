import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clientId, userId } = await req.json();

    if (!clientId || !userId) {
      throw new Error('Client ID and User ID are required');
    }

    // Get target client's assessments
    const { data: targetAssessments, error: targetError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false });

    if (targetError) {
      throw new Error(`Target client lookup error: ${targetError.message}`);
    }

    // Get all other clients for this user with their assessments
    const { data: otherClients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        assessment_results (
          assessment_type,
          score,
          risk_level,
          completed_at
        )
      `)
      .eq('user_id', userId)
      .neq('id', clientId);

    if (clientsError) {
      throw new Error(`Other clients lookup error: ${clientsError.message}`);
    }

    const prompt = `
Find similar clients based on assessment patterns and risk profiles.

Target Client Assessments:
${targetAssessments.map(a => `
- ${a.assessment_type}: Score ${a.score}, Risk: ${a.risk_level}
`).join('\n')}

Other Clients:
${otherClients.map(c => `
Client: ${c.first_name} ${c.last_name}
Assessments: ${c.assessment_results.map(a => `${a.assessment_type}: ${a.score} (${a.risk_level})`).join(', ')}
`).join('\n')}

Analyze patterns and return similar clients in JSON format:
{
  "similarClients": [
    {
      "clientId": "uuid",
      "name": "First Last",
      "similarityScore": 0.0-1.0,
      "commonFactors": ["list of similar patterns"],
      "keyDifferences": ["notable differences"],
      "recommendedActions": ["suggested comparisons or interventions"]
    }
  ],
  "insights": "overall analysis of client patterns"
}

Focus on clinical relevance and assessment patterns rather than demographics.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a clinical data analyst helping identify patterns across client assessments to improve treatment outcomes.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const matchingResults = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(matchingResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-client-matching:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});