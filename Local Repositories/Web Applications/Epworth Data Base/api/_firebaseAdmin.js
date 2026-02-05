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

  // Fall back to default credentials if available (e.g., GOOGLE_APPLICATION_CREDENTIALS)
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
