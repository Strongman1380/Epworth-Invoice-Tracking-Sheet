import admin from 'firebase-admin'

let _app

export function getAdminApp() {
  if (_app) return _app

  if (admin.apps.length) {
    _app = admin.app()
    return _app
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (serviceAccountJson) {
    const creds = JSON.parse(serviceAccountJson)
    _app = admin.initializeApp({
      credential: admin.credential.cert(creds),
    })
    return _app
  }

  // Fall back to project ID for token verification (no full admin features)
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (projectId) {
    _app = admin.initializeApp({ projectId })
    return _app
  }

  // Last resort: default credentials (works in Google Cloud environments)
  _app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
  return _app
}

export function getAuth() {
  return getAdminApp().auth()
}

export function getDb() {
  return getAdminApp().firestore()
}
