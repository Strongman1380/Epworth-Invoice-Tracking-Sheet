import { json, methodNotAllowed } from './_utils.js'
import { getDb } from './_firebaseAdmin.js'
import { requireCronAuth } from './_auth.js'

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

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
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res)

  const authorized = await requireCronAuth(req, res)
  if (!authorized) return

  try {
    const db = getDb()
    const appId = process.env.APP_ID || 'case-note-app-v1'
    const lookaheadDays = parseInt(process.env.AUTH_ALERT_DAYS || '14', 10)

    const directoryRef = db.collection('artifacts').doc(appId).collection('case_directory')
    const snapshot = await directoryRef.get()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alerts = []

    snapshot.forEach((doc) => {
      const data = doc.data() || {}
      const name = data.Case_Name || data.CaseName || data.family_name || doc.id
      const mc = data.MC_Number || data.master_case || ''

      const authHistory = Array.isArray(data.Authorization_History)
        ? data.Authorization_History
        : []

      if (authHistory.length) {
        authHistory.forEach((auth) => {
          if (auth?.is_archived) return
          const end = parseDate(auth?.end_date || auth?.endDate || auth?.end)
          if (!end) return
          const daysLeft = daysBetween(today, end)
          if (daysLeft >= 0 && daysLeft <= lookaheadDays) {
            alerts.push({
              type: 'authorization_expiring',
              caseName: name,
              masterCase: mc,
              serviceType: auth?.service_type || 'GENERAL',
              endDate: end.toISOString().slice(0, 10),
              daysLeft,
            })
          }
        })
        return
      }

      const end = parseDate(data.Auth_End_Date)
      if (end) {
        const daysLeft = daysBetween(today, end)
        if (daysLeft >= 0 && daysLeft <= lookaheadDays) {
          alerts.push({
            type: 'authorization_expiring',
            caseName: name,
            masterCase: mc,
            serviceType: 'GENERAL',
            endDate: end.toISOString().slice(0, 10),
            daysLeft,
          })
        }
      }
    })

    const payload = {
      subject: `Authorization alerts (${alerts.length})`,
      message: alerts.length
        ? `Found ${alerts.length} authorizations expiring in the next ${lookaheadDays} days.`
        : 'No expiring authorizations found.',
      alerts,
      ts: new Date().toISOString(),
    }

    const webhook = await postWebhook(payload)
    return json(res, 200, { ok: true, alerts, webhook })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Auth alert check failed' })
  }
}
