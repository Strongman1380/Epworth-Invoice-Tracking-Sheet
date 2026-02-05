export function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function methodNotAllowed(res) {
  json(res, 405, { error: 'Method not allowed' })
}

export function notImplemented(res, message) {
  json(res, 501, {
    error: message || 'Not implemented. Configure this endpoint to enable functionality.',
  })
}

export function useMock() {
  return String(process.env.USE_MOCK_API || '').toLowerCase() === 'true'
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
