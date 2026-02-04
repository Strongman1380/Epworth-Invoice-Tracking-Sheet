// Firebase Configuration - ENABLED
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1wUyv15yap-K9ZFKvhpmOhKO2zxOExLc",
  authDomain: "staff-invoice-sheet.firebaseapp.com",
  projectId: "staff-invoice-sheet",
  storageBucket: "staff-invoice-sheet.firebasestorage.app",
  messagingSenderId: "94496038126",
  appId: "1:94496038126:web:11f7c86d50328525eaa7ff",
  measurementId: "G-CQWGFRR8J5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

console.log('✅ Firebase initialized successfully');
console.log('📊 Analytics enabled');
console.log('🗄️  Firestore ready (currently using localStorage as primary)');

// Sign in anonymously (allows users to save without creating accounts)
signInAnonymously(auth)
    .then(() => {
        console.log('🔐 Firebase authenticated (anonymous)');
    })
    .catch((error) => {
        console.error('❌ Firebase auth error:', error);
    });

// Save timesheet to Firestore
export async function saveTimesheetToFirebase(timesheetData) {
    try {
        const docRef = await addDoc(collection(db, "timesheets"), {
            ...timesheetData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("📄 Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("❌ Error adding document: ", e);
        throw e;
    }
}

// Load all timesheets from Firestore
export async function loadTimesheetsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "timesheets"));
        const timesheets = [];
        querySnapshot.forEach((doc) => {
            timesheets.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log(`📚 Loaded ${timesheets.length} timesheets from Firestore`);
        return timesheets;
    } catch (e) {
        console.error("❌ Error loading documents: ", e);
        throw e;
    }
}

// Update timesheet in Firestore
export async function updateTimesheetInFirebase(id, timesheetData) {
    try {
        const docRef = doc(db, "timesheets", id);
        await updateDoc(docRef, {
            ...timesheetData,
            updatedAt: new Date()
        });
        console.log("✏️ Document updated: ", id);
    } catch (e) {
        console.error("❌ Error updating document: ", e);
        throw e;
    }
}

// Delete timesheet from Firestore
export async function deleteTimesheetFromFirebase(id) {
    try {
        await deleteDoc(doc(db, "timesheets", id));
        console.log("🗑️ Document deleted: ", id);
    } catch (e) {
        console.error("❌ Error deleting document: ", e);
        throw e;
    }
}

// ========================================
// SYNC UTILITIES
// ========================================

// Sync timesheet to Firebase (called from app.js after save)
export async function syncTimesheetToFirebase(timesheetData) {
    try {
        if (timesheetData.firebaseId) {
            // Update existing
            await updateTimesheetInFirebase(timesheetData.firebaseId, timesheetData);
        } else {
            // Create new
            const firebaseId = await saveTimesheetToFirebase(timesheetData);
            timesheetData.firebaseId = firebaseId;
        }
        timesheetData.syncStatus = 'synced';
        return timesheetData;
    } catch (e) {
        console.error('Sync failed:', e);
        timesheetData.syncStatus = 'pending';
        throw e;
    }
}

// Sync all local timesheets to Firebase
export async function syncAllToFirebase() {
    const manifest = JSON.parse(localStorage.getItem('timesheet_manifest') || '{"timesheets":{}}');
    const results = { success: 0, failed: 0 };

    for (const id of Object.keys(manifest.timesheets)) {
        try {
            const data = JSON.parse(localStorage.getItem(`timesheet_${id}`));
            await syncTimesheetToFirebase(data);
            localStorage.setItem(`timesheet_${id}`, JSON.stringify(data));
            results.success++;
        } catch (e) {
            results.failed++;
        }
    }

    return results;
}

// Export for use in app.js (if needed later)
export { app, analytics, db, auth };
