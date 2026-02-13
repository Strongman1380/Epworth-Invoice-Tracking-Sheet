import { json, methodNotAllowed } from './_utils.js'
import { getAuth } from './_firebaseAdmin.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)

  const decoded = await requireAuth(req, res)
  if (!decoded) return

  if (!decoded._isAdmin) {
    return json(res, 403, { error: 'Not authorized to create users — admin only' })
  }

  try {
    const { email, password, displayName } = req.body || {}
    if (!email || !password) return json(res, 400, { error: 'email and password are required' })

    const auth = getAuth()
    const userRecord = await auth.createUser({ email, password, displayName })
    return json(res, 200, { ok: true, uid: userRecord.uid })
  } catch (err) {
    return json(res, 500, { error: err?.message || 'User creation failed' })
  }
}
