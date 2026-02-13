import OpenAI, { toFile } from 'openai'

let _client

export function getOpenAI() {
  if (!_client) {
    const apiKey = (process.env.OPENAI_API_KEY || '').replace(/\\n/g, '').trim()
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    _client = new OpenAI({ apiKey })
  }
  return _client
}

export async function chatJson({ system, user, schema, name, model }) {
  const client = getOpenAI()
  const response = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system || 'Return only valid JSON.' },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: name || 'response',
        schema,
        strict: true,
      },
    },
  })

  const content = response.choices?.[0]?.message?.content || '{}'
  return JSON.parse(content)
}

export async function chatText({ system, user, model }) {
  const client = getOpenAI()
  const response = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system || 'Provide a concise, professional response.' },
      { role: 'user', content: user },
    ],
  })
  return response.choices?.[0]?.message?.content || ''
}

export async function transcribeAudio({ buffer, filename, mimeType }) {
  const client = getOpenAI()
  const file = await toFile(buffer, filename || 'audio.webm', mimeType ? { type: mimeType } : undefined)
  const result = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
  })
  return result?.text || ''
}
