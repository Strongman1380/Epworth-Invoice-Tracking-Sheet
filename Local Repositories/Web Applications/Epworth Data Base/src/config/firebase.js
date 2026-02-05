import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Firebase configuration - hardcoded for Epworth Family Resources
const firebaseConfig = {
  apiKey: "AIzaSyCwXdQN8RnoOo1lwHJ0lWy4Op9rERFaQDg",
  authDomain: "epworth-family-resources-docs.firebaseapp.com",
  projectId: "epworth-family-resources-docs",
  storageBucket: "epworth-family-resources-docs.firebasestorage.app",
  messagingSenderId: "498189568916",
  appId: "1:498189568916:web:f51272cbce734e9c029d81",
  measurementId: "G-2J0F3NGZHL",
};

const isFirebaseConfigured = (cfg) => {
  if (!cfg || typeof cfg !== "object") return false;
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  if (!required.every((k) => Boolean(cfg[k]))) return false;
  const looksPlaceholder =
    String(cfg.apiKey).includes("YOUR_") ||
    String(cfg.projectId).includes("YOUR_") ||
    String(cfg.authDomain).includes("YOUR_") ||
    String(cfg.appId).includes("YOUR_");
  return !looksPlaceholder;
};

let _app = null;
let _auth = null;
let _db = null;
let _initError = null;

try {
  if (isFirebaseConfigured(firebaseConfig)) {
    _app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    _auth = firebase.auth();
    _db = firebase.firestore();
  } else {
    _initError = "Firebase configuration is invalid";
    console.error(_initError);
  }
} catch (error) {
  _initError = error.message || "Firebase initialization failed";
  console.error("Firebase Initialization Error:", error);
}

/**
 * Get the Firebase app instance.
 * @throws {Error} If Firebase is not configured
 */
const getApp = () => {
  if (!_app) {
    throw new Error(_initError || "Firebase not configured. Set VITE_FIREBASE_* environment variables. See .env.example.");
  }
  return _app;
};

/**
 * Get the Firebase Auth instance.
 * @throws {Error} If Firebase is not configured
 */
const getAuth = () => {
  if (!_auth) {
    throw new Error(_initError || "Firebase not configured. Set VITE_FIREBASE_* environment variables. See .env.example.");
  }
  return _auth;
};

/**
 * Get the Firestore database instance.
 * @throws {Error} If Firebase is not configured
 */
const getDb = () => {
  if (!_db) {
    throw new Error(_initError || "Firebase not configured. Set VITE_FIREBASE_* environment variables. See .env.example.");
  }
  return _db;
};

// Legacy exports for backward compatibility (may be null)
const app = _app;
const auth = _auth;
const db = _db;

export { firebase, firebaseConfig, isFirebaseConfigured, app, auth, db, getApp, getAuth, getDb };
