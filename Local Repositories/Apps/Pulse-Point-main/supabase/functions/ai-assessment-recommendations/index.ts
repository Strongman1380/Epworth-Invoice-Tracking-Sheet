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
    const { clientId, assessmentHistory } = await req.json();

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    // Get client's assessment history
    const { data: assessments, error } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const prompt = `
Based on the following client assessment history, recommend the most appropriate next assessment:

Assessment History:
${assessments.map(a => `
- Assessment: ${a.assessment_type}
- Score: ${a.score}
- Risk Level: ${a.risk_level}
- Date: ${a.completed_at}
- Notes: ${a.notes || 'None'}
`).join('\n')}

Available Assessments:
- PCL-5: PTSD Checklist for DSM-5 (trauma assessment)
- ACE: Adverse Childhood Experiences (childhood trauma)
- TSQ: Trauma Screening Questionnaire (brief trauma screening)

Provide a recommendation in JSON format:
{
  "recommendedAssessment": "assessment_type",
  "reason": "brief explanation",
  "priority": "low|medium|high",
  "timeframe": "suggested timeframe"
}
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
            content: 'You are a clinical assessment expert. Provide evidence-based recommendations for trauma assessments based on client history.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const recommendation = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(recommendation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assessment-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});