import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getStorage, type FirebaseStorage } from "firebase/storage"

function getFirebaseConfig() {
  // Prefer NEXT_PUBLIC_ env vars (local dev / Netlify)
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  }

  // Fallback: FIREBASE_WEBAPP_CONFIG injected by Firebase App Hosting
  const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG
  if (webappConfig) {
    try {
      return JSON.parse(webappConfig)
    } catch {
      // ignore parse errors
    }
  }

  return null
}

function initFirebase(): FirebaseApp | null {
  if (getApps().length > 0) return getApps()[0]
  const config = getFirebaseConfig()
  if (!config || !config.apiKey) return null
  return initializeApp(config)
}

const app = initFirebase()

// Auth and storage are safe to call only when app is initialized
// During SSR prerender without config, these will be null-ish but
// auth-context guards usage behind useEffect (client-only)
export const auth = app ? getAuth(app) : (null as unknown as Auth)
export const storage = app ? getStorage(app) : (null as unknown as FirebaseStorage)
export default app
