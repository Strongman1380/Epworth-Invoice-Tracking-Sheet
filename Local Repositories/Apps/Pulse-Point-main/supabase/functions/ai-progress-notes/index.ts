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
    const { clientId, rawNotes, assessmentData } = await req.json();

    if (!clientId || !rawNotes) {
      throw new Error('Client ID and raw notes are required');
    }

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw new Error(`Client lookup error: ${clientError.message}`);
    }

    const prompt = `
Convert the following raw clinical notes into a structured, professional progress note for ${client.first_name} ${client.last_name}:

Raw Notes: ${rawNotes}

${assessmentData ? `Recent Assessment Data:
- Assessment Type: ${assessmentData.type}
- Score: ${assessmentData.score}
- Risk Level: ${assessmentData.riskLevel}
` : ''}

Format the response as a structured progress note with the following sections:
- Subjective: Client's reported experiences and concerns
- Objective: Observable behaviors and assessment results
- Assessment: Clinical interpretation and risk level
- Plan: Recommended interventions and next steps

Maintain professional clinical language while being concise and HIPAA-compliant.
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
            content: 'You are a licensed clinical professional helping to structure progress notes. Maintain confidentiality and professional standards.' 
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
    const structuredNote = data.choices[0].message.content;

    return new Response(JSON.stringify({ structuredNote }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-progress-notes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});