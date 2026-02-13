import { json, methodNotAllowed } from './_utils.js'
import { transcribeAudio } from './_openai.js'
import { requireAuth } from './_auth.js'

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '')
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { audioBase64, mimeType, filename } = req.body || {}
    if (!audioBase64) {
      return json(res, 400, { error: 'audioBase64 is required' })
    }

    const parsed = parseDataUrl(audioBase64)
    const base64 = parsed?.base64 || audioBase64
    const type = parsed?.mimeType || mimeType || 'audio/webm'
    const buffer = Buffer.from(base64, 'base64')

    const text = await transcribeAudio({
      buffer,
      filename: filename || (type.includes('mp4') ? 'audio.m4a' : 'audio.webm'),
      mimeType: type,
    })

    return json(res, 200, { text })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Transcription failed' })
  }
}
