import { json } from './_utils.js'
import { getAuth } from './_firebaseAdmin.js'

const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAIN || 'epworthfamilyresources.org')
  .split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
const FALLBACK_ADMIN_EMAILS = ['bhinrichs1380@gmail.com']

function getBearerToken(req) {
  const header = req.headers?.authorization || ''
  const match = /^Bearer\s+(.*)$/i.exec(header)
  return match?.[1] || null
}

function getAdminEmails() {
  const raw = String(process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return raw.length ? raw : FALLBACK_ADMIN_EMAILS
}

function getAllowedEmails() {
  return String(process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

function isEmailAuthorized(email) {
  if (!email) return false
  const lower = email.toLowerCase()
  // 1. Check allowed domains
  if (ALLOWED_DOMAINS.some(domain => lower.endsWith(`@${domain}`))) return true
  // 2. Check admin list
  if (getAdminEmails().includes(lower)) return true
  // 3. Check allowed list
  if (getAllowedEmails().includes(lower)) return true
  return false
}

function isAdmin(email) {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

/**
 * Verify Firebase ID token and check that the user's email is authorized.
 * Returns the decoded token on success, or sends a 401/403 and returns null.
 */
export async function requireAuth(req, res) {
  const token = getBearerToken(req)
  if (!token) {
    json(res, 401, { error: 'Missing Authorization bearer token' })
    return null
  }

  try {
    const auth = getAuth()
    const decoded = await auth.verifyIdToken(token)

    if (!isEmailAuthorized(decoded.email)) {
      json(res, 403, { error: 'Access denied — email not authorized' })
      return null
    }

    decoded._isAdmin = isAdmin(decoded.email)
    return decoded
  } catch (err) {
    const msg = err?.message || ''
    if (msg.includes('credential') || msg.includes('FIREBASE') || msg.includes('default credentials')) {
      console.error('Firebase Admin init error:', msg)
      json(res, 500, { error: 'Server auth configuration error' })
    } else {
      json(res, 401, { error: 'Invalid or expired token' })
    }
    return null
  }
}

/**
 * Verify Vercel CRON_SECRET for scheduled endpoints.
 * Returns true on success, or sends a 401 and returns false.
 */
export async function requireCronAuth(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // If no secret is configured, allow the request (dev/local)
    return true
  }
  const provided = req.headers?.authorization === `Bearer ${secret}`
  if (!provided) {
    json(res, 401, { error: 'Unauthorized — invalid cron secret' })
    return false
  }
  return true
}
