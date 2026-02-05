import { json, methodNotAllowed } from './_utils.js'
import { getAuth } from './_firebaseAdmin.js'

function getBearerToken(req) {
  const header = req.headers?.authorization || ''
  const match = /^Bearer\s+(.*)$/i.exec(header)
  return match?.[1] || null
}

function emailAllowed(email) {
  const fallbackAdmins = ['bhinrichs1380@gmail.com']
  const list = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const allowed = list.length ? list : fallbackAdmins
  return allowed.includes(String(email || '').toLowerCase())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  try {
    const token = getBearerToken(req)
    if (!token) return json(res, 401, { error: 'Missing Authorization bearer token' })

    const auth = getAuth()
    const decoded = await auth.verifyIdToken(token)

    if (process.env.REQUIRE_ADMIN_CLAIM === 'true' && !decoded.admin) {
      return json(res, 403, { error: 'Admin claim required' })
    }

    if (!emailAllowed(decoded.email)) {
      return json(res, 403, { error: 'Not authorized to create users' })
    }

    const { email, password, displayName } = req.body || {}
    if (!email || !password) return json(res, 400, { error: 'email and password are required' })

    const userRecord = await auth.createUser({ email, password, displayName })
    return json(res, 200, { ok: true, uid: userRecord.uid })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'User creation failed' })
  }
}
