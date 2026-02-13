import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'
import { requireAuth } from './_auth.js'

// Rough estimate: 1 token ≈ 4 characters. Keep under ~100k tokens for safety.
const MAX_PROMPT_CHARS = 380000

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    let { prompt } = req.body || {}
    if (!prompt) return json(res, 400, { error: 'prompt is required' })

    // Truncate if prompt is too large
    if (prompt.length > MAX_PROMPT_CHARS) {
      prompt = prompt.slice(0, MAX_PROMPT_CHARS) + '\n\n[Note: Data was truncated due to size. Analyze what is provided.]'
    }

    const system =
      'You are a supervisor of in-home family services at Epworth Family Resources with a clinical background. ' +
      'You write in a casually professional tone — like a knowledgeable clinical supervisor who is warm, straightforward, and grounded. ' +
      'Use plain, human language. Say things naturally, not in stiff corporate-speak. Contractions are fine. ' +
      'Refer to workers as "the FLS" or "FLS [LastName]" (Family Life Specialist). Write in third person. ' +
      'Be balanced and honest: document both strengths and concerns. ' +
      'Use trauma-informed language naturally, not as buzzwords. ' +
      'Be specific and factual — cite dates, observations, and data from the notes. ' +
      'If there are safety concerns or lack of progress, state them clearly and directly. ' +
      'If drug testing data is present (results, substances, chain of custody), always include it. ' +
      'FORMATTING: Do not use markdown. No asterisks, no bold markers, no bullet symbols. ' +
      'Use ALL CAPS for section headers (e.g., CASE OVERVIEW, SERVICE DELIVERY, SAFETY ASSESSMENT). ' +
      'Use plain text only. Do not pad with filler or generic statements.'

    const text = await chatText({
      system,
      user: prompt,
      model: process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })

    return json(res, 200, { text })
  } catch (err) {
    const errType = err?.constructor?.name || 'Error'
    const errMsg = err?.message || 'Report generation failed'
    console.error(`generateReport ${errType}:`, errMsg, err?.status || '', err?.code || '')
    return json(res, 500, { error: `${errMsg} [${errType}]` })
  }
}
