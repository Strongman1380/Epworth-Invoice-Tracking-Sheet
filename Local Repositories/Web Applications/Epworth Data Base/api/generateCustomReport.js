import { json, methodNotAllowed } from './_utils.js'
import { chatText } from './_openai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const { prompt } = req.body || {}
    if (!prompt) return json(res, 400, { error: 'prompt is required' })

    const system =
      'You generate concise, professional reports for a family services organization. ' +
      'Return plain text without markdown.'

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
