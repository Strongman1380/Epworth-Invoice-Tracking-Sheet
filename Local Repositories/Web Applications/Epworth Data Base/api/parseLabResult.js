import { json, methodNotAllowed } from './_utils.js'
import { getOpenAI } from './_openai.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)
  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { imageBase64 } = req.body || {}
    if (!imageBase64) return json(res, 400, { error: 'imageBase64 is required' })

    // Strip data URL prefix if present
    const base64 = imageBase64.replace(/^data:image\/[^;]+;base64,/, '')
    const client = getOpenAI()

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Extract all lab result information from this drug test lab report image.
Format the output as a clean, structured report:
- Lab Name / Facility
- Specimen ID / Accession Number
- Collection Date
- Report Date
- Specimen Type
- For each substance tested: substance name and result (Positive/Negative) with levels if shown
- Confirmation method if noted
- Any flags, notes, or comments from the lab
Be thorough and accurate. Only include information visible in the image.`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the lab results from this drug test report:' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }
          ]
        }
      ],
      max_tokens: 2000,
    })

    const text = response.choices?.[0]?.message?.content || ''
    return json(res, 200, { text })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Lab result extraction failed' })
  }
}
