import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { assessmentType, responses, rawScore } = await req.json();

    if (!assessmentType || !responses) {
      throw new Error('Assessment type and responses are required');
    }

    const prompt = `
Analyze the following ${assessmentType} assessment responses and provide an enhanced risk assessment:

Assessment Type: ${assessmentType}
Raw Score: ${rawScore}
Responses: ${JSON.stringify(responses, null, 2)}

Based on the responses, provide a detailed risk analysis in JSON format:
{
  "riskLevel": "low|moderate|high|severe",
  "confidenceScore": 0.0-1.0,
  "keyIndicators": ["list of concerning responses"],
  "protectiveFactors": ["list of positive indicators"],
  "recommendations": ["immediate action items"],
  "followUpTimeframe": "suggested timeframe for next assessment",
  "specialConsiderations": "any specific clinical notes"
}

Consider clinical best practices and evidence-based risk factors for trauma assessments.
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
            content: 'You are a clinical assessment expert specializing in trauma and risk assessment. Provide evidence-based analysis while maintaining clinical objectivity.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    const riskAnalysis = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(riskAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-risk-assessment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});