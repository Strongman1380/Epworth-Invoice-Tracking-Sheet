import { json, methodNotAllowed } from './_utils.js'
import { requireAuth } from './_auth.js'

async function postWebhook(payload) {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return { ok: false, skipped: true }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return { ok: resp.ok, status: resp.status }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { subject, message, alerts } = req.body || {}
    const payload = {
      subject: subject || 'Security Alert',
      message: message || 'Alert triggered',
      alerts: Array.isArray(alerts) ? alerts : [],
      ts: new Date().toISOString(),
    }

    const webhook = await postWebhook(payload)
    return json(res, 200, { ok: true, webhook })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Failed to send alert' })
  }
}
