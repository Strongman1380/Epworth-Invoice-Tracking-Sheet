const DEFAULT_TIMEOUT_MS = 30000

function pickFirstText(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (typeof obj.text === 'string') return obj.text
  if (typeof obj.summary === 'string') return obj.summary
  if (Array.isArray(obj.choices) && obj.choices[0]) {
    const choice = obj.choices[0]
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content
    if (typeof choice.text === 'string') return choice.text
  }
  if (Array.isArray(obj.output) && obj.output[0]) {
    const out = obj.output[0]
    if (Array.isArray(out.content) && out.content[0] && typeof out.content[0].text === 'string') {
      return out.content[0].text
    }
  }
  return ''
}

export async function callAi({ prompt, system, temperature = 0.2, maxTokens = 1200 }) {
  const url = process.env.AI_API_URL
  if (!url) throw new Error('AI_API_URL is not configured')

  const style = String(process.env.AI_API_STYLE || 'chat').toLowerCase()
  const model = process.env.AI_MODEL || 'default'

  const headers = { 'Content-Type': 'application/json' }
  if (process.env.AI_API_KEY) headers.Authorization = `Bearer ${process.env.AI_API_KEY}`

  let body
  if (style === 'prompt') {
    body = { model, prompt, temperature, max_tokens: maxTokens, system }
  } else {
    body = {
      model,
      messages: [
        system ? { role: 'system', content: system } : null,
        { role: 'user', content: prompt },
      ].filter(Boolean),
      temperature,
      max_tokens: maxTokens,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const message = data?.error?.message || data?.error || resp.statusText
      throw new Error(message || `AI request failed (${resp.status})`)
    }

    const text = pickFirstText(data)
    if (!text) throw new Error('AI response did not include text')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

export function safeJsonParse(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
