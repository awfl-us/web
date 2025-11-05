import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

const auth = getAuth(app)
// Persist session locally so refreshes keep the user signed in
setPersistence(auth, browserLocalPersistence).catch(() => {})

const provider = new GoogleAuthProvider()

export { app, auth, provider }
