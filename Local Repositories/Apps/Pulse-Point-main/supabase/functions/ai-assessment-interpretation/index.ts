import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Assessment knowledge base
const assessmentKnowledge = {
  'PCL-5': {
    name: 'PTSD Checklist for DSM-5',
    purpose: 'Assesses PTSD symptoms according to DSM-5 criteria',
    scoringRange: '0-80',
    cutoffScore: 33,
    subscales: ['Intrusion', 'Avoidance', 'Negative Alterations', 'Arousal/Reactivity'],
    interpretation: 'Scores 31-33 suggest probable PTSD; scores >33 indicate significant PTSD symptoms'
  },
  'PHQ-9': {
    name: 'Patient Health Questionnaire-9',
    purpose: 'Screens for depression and measures severity',
    scoringRange: '0-27',
    cutoffScore: 10,
    subscales: ['Depression Severity'],
    interpretation: '0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe'
  },
  'GAD-7': {
    name: 'Generalized Anxiety Disorder-7',
    purpose: 'Screens for generalized anxiety disorder',
    scoringRange: '0-21',
    cutoffScore: 10,
    subscales: ['Anxiety Severity'],
    interpretation: '0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe anxiety'
  },
  'ACE': {
    name: 'Adverse Childhood Experiences',
    purpose: 'Assesses childhood trauma exposure',
    scoringRange: '0-10',
    cutoffScore: 4,
    subscales: ['Abuse', 'Neglect', 'Household Dysfunction'],
    interpretation: 'Score of 4+ indicates high ACE exposure; correlates with health risks'
  },
  'CD-RISC-10': {
    name: 'Connor-Davidson Resilience Scale-10',
    purpose: 'Measures resilience and adaptive coping',
    scoringRange: '0-40',
    cutoffScore: 25,
    subscales: ['Resilience'],
    interpretation: 'Higher scores indicate greater resilience; 25+ suggests moderate to high resilience'
  },
  'IES-R': {
    name: 'Impact of Event Scale-Revised',
    purpose: 'Measures traumatic stress symptoms',
    scoringRange: '0-88',
    cutoffScore: 33,
    subscales: ['Intrusion', 'Avoidance', 'Hyperarousal'],
    interpretation: 'Scores 33+ suggest clinical concern for PTSD'
  },
  'TSQ': {
    name: 'Trauma Screening Questionnaire',
    purpose: 'Brief screening for trauma-related symptoms',
    scoringRange: '0-10',
    cutoffScore: 6,
    subscales: ['PTSD Screening'],
    interpretation: '6+ positive responses suggests need for comprehensive PTSD assessment'
  },
  'PC-PTSD-5': {
    name: 'Primary Care PTSD Screen for DSM-5',
    purpose: 'Brief PTSD screening tool for primary care',
    scoringRange: '0-5',
    cutoffScore: 3,
    subscales: ['PTSD Screening'],
    interpretation: '3+ positive responses suggests probable PTSD; warrants further assessment'
  },
  'LEC-5': {
    name: 'Life Events Checklist for DSM-5',
    purpose: 'Assesses lifetime traumatic event exposure',
    scoringRange: 'Categorical',
    cutoffScore: 'N/A',
    subscales: ['Trauma Exposure'],
    interpretation: 'Documents traumatic experiences; used alongside PTSD assessments'
  },
  'BTQ': {
    name: 'Brief Trauma Questionnaire',
    purpose: 'Screens for trauma history and PTSD symptoms',
    scoringRange: 'Categorical',
    cutoffScore: 'Variable',
    subscales: ['Trauma History', 'PTSD Symptoms'],
    interpretation: 'Identifies trauma exposure and basic PTSD symptomatology'
  },
  'CTSQ': {
    name: 'Child Trauma Screening Questionnaire',
    purpose: 'Screens for trauma exposure in children',
    scoringRange: 'Categorical',
    cutoffScore: 'Variable',
    subscales: ['Child Trauma'],
    interpretation: 'Identifies children who may need trauma-focused intervention'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { assessmentType, responses, score, answers, questions } = await req.json();

    if (!assessmentType) {
      throw new Error('Assessment type is required');
    }

    // Get assessment knowledge
    const knowledge = assessmentKnowledge[assessmentType as keyof typeof assessmentKnowledge] || {
      name: assessmentType,
      purpose: 'Clinical assessment tool',
      scoringRange: 'Variable',
      cutoffScore: 'N/A',
      subscales: ['Overall'],
      interpretation: 'Refer to clinical guidelines for interpretation'
    };

    // Prepare detailed question-by-question responses
    const detailedResponses = questions?.map((q: any, index: number) => ({
      question: q.text || q.clinical || 'Question text',
      category: q.category || 'General',
      response: answers?.[q.id] || responses?.[index] || 'Not answered'
    })) || [];

    const prompt = `
You are a licensed clinical psychologist specializing in trauma assessment and evidence-based treatment. You are analyzing a ${knowledge.name} (${assessmentType}) assessment.

ASSESSMENT DETAILS:
- Assessment Name: ${knowledge.name}
- Purpose: ${knowledge.purpose}
- Scoring Range: ${knowledge.scoringRange}
- Clinical Cutoff: ${knowledge.cutoffScore}
- Subscales: ${knowledge.subscales.join(', ')}
- Standard Interpretation: ${knowledge.interpretation}

CLIENT RESULTS:
- Total Score: ${score || 'Not calculated'}
- Responses: ${JSON.stringify(detailedResponses, null, 2)}

TASK:
Provide a comprehensive clinical interpretation for the printout that includes:

1. **Score Interpretation**: What this specific score means clinically
2. **Symptom Patterns**: Key patterns observed in the responses
3. **Clinical Significance**: Level of clinical concern and urgency
4. **Strengths & Resources**: Protective factors and positive indicators
5. **Recommendations**: Evidence-based next steps for treatment
6. **Follow-up**: Suggested monitoring and reassessment timeline
7. **Differential Considerations**: Other conditions to consider
8. **Clinical Notes**: Additional considerations for the provider

Return your analysis in this exact JSON format:
{
  "scoreInterpretation": "Detailed explanation of what the score means",
  "symptomPatterns": ["List of 3-5 key symptom patterns observed"],
  "clinicalSignificance": {
    "level": "minimal|mild|moderate|severe",
    "urgency": "routine|prompt|urgent|immediate",
    "explanation": "Brief clinical rationale"
  },
  "strengthsAndResources": ["List of 3-5 protective factors or strengths"],
  "recommendations": {
    "immediate": ["Actions needed now"],
    "shortTerm": ["Actions in next 1-2 weeks"],
    "longTerm": ["Ongoing treatment considerations"]
  },
  "followUp": {
    "timeline": "Suggested timeframe for reassessment",
    "reassessmentTools": ["Suggested assessments to administer"],
    "monitoringFocus": ["Specific symptoms or areas to monitor"]
  },
  "differentialConsiderations": ["Other conditions or factors to consider"],
  "clinicalNotes": "Additional important information for the provider",
  "summary": "A 2-3 sentence summary suitable for printing"
}

Be specific, evidence-based, and clinically appropriate. Consider the severity of responses and provide actionable guidance.
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
            content: `You are a licensed clinical psychologist with expertise in psychological assessment, trauma-informed care, and evidence-based treatment. You understand all major clinical assessment tools and their proper interpretation according to the latest research and clinical guidelines. You provide clear, actionable, and clinically appropriate interpretations.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2, // Lower temperature for more consistent, clinical responses
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    const interpretation = JSON.parse(data.choices[0].message.content);

    // Add metadata
    const result = {
      ...interpretation,
      assessmentInfo: knowledge,
      generatedAt: new Date().toISOString(),
      aiModel: 'gpt-4o-mini'
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assessment-interpretation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallbackInterpretation: {
          scoreInterpretation: "Unable to generate AI interpretation at this time. Please refer to standard clinical guidelines for this assessment.",
          summary: "AI interpretation unavailable. Consult clinical guidelines."
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
