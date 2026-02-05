import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const { prompt } = req.body || {}
    if (!prompt) return json(res, 400, { error: 'prompt is required' })

    const system =
      'You are a Family Life Specialist (FLS) at Epworth Family Resources - a trauma-informed family support professional writing reports. ' +
      'Write in third person professional voice (e.g., "The FLS observed...", "Family Life Specialist provided..."). ' +
      'Never use first person (I, me, my). Always refer to yourself as "the FLS" or "Family Life Specialist". ' +
      'Be BALANCED and HONEST: document both progress/strengths AND concerns/challenges. ' +
      'Use trauma-informed, non-judgmental language - describe behaviors and observations, not character. ' +
      'Be specific and factual. If there are safety concerns or lack of progress, state them clearly. ' +
      'Write in a professional, concise tone. Do not include markdown.'

    const text = await chatText({
      system,
      user: prompt,
      model: process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, { text })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Report generation failed' })
  }
}
