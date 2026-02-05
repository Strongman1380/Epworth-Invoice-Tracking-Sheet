import { json, methodNotAllowed } from './_utils.js'
import { chatJson } from './_openai.js'

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    service_type: { type: 'string' },
    contact_type: { type: 'string' },
    date: { type: 'string' },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
    family_name: { type: 'string' },
    master_case: { type: 'string' },
    location: { type: 'string' },
    participants: { type: 'string' },
    visit_narrative: { type: 'string' },
    safety_assessment: { type: 'string' },
    interventions: { type: 'string' },
    plan: { type: 'string' },
    interactions: { type: 'string' },
    parenting_skills: { type: 'string' },
    specimen_collected: { type: 'string' },
    chain_of_custody: { type: 'string' },
    client_admission: { type: 'string' },
    engagement: { type: 'string' },
    cancellation_notification: { type: 'string' },
    cancellation_service_prep: { type: 'string' },
    cancellation_pre_call: { type: 'string' },
    cancellation_en_route: { type: 'string' },
    goals_addressed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          goal: { type: 'string' },
          response: { type: 'string' },
          rating: { type: 'string' },
          next_steps: { type: 'string' },
        },
        required: ['goal'],
      },
    },
  },
  required: ['service_type', 'contact_type', 'date', 'family_name', 'master_case', 'goals_addressed'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const { text, hint } = req.body || {}
    if (!text) return json(res, 400, { error: 'text is required' })

    const system =
      'You are a Family Life Specialist (FLS) at Epworth Family Resources - a trauma-informed family support professional. ' +
      'Extract and structure information from rough notes into professional, ethical, and factual documentation. ' +
      'Write all narratives in third person professional voice (e.g., "The FLS observed..." or "Family Life Specialist provided..."). ' +
      'Never use first person (I, me, my). Always refer to yourself as "the FLS" or "Family Life Specialist". ' +
      'Be balanced and honest: document BOTH strengths/progress AND concerns/challenges observed. ' +
      'Use trauma-informed language - avoid judgmental terms, focus on behaviors not character. ' +
      'Be specific and factual - include concrete observations, not assumptions. ' +
      'If there are safety concerns, document them clearly and professionally. ' +
      'Document parent-child interactions, engagement levels, and any barriers to progress. ' +
      'Return only JSON that matches the schema. Use empty strings when unknown. ' +
      'Dates must be YYYY-MM-DD and times HH:MM (24h). ' +
      'Valid service_type: OHFS/IHFS, PTSV, DST-U, DST-MS, DST-SP, DST-HF. ' +
      'Valid contact_type: Face-to-Face Visit, Virtual Visit, Phone Call, Text Message, Monitored Visit, Cancelled by Parent, Cancelled by Worker.'

    const user = `Parse this case note into structured fields.\n\nText:\n${text}\n\nHints:\n${JSON.stringify(hint || {})}`

    const result = await chatJson({
      system,
      user,
      schema,
      name: 'case_note_parse',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, result)
  } catch (err) {
    return json(res, 500, { error: err?.message || 'AI parse failed' })
  }
}
