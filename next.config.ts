import type { NextConfig } from "next";

// On Firebase App Hosting, FIREBASE_WEBAPP_CONFIG is injected as a server env
// var. Parse it and expose each field as NEXT_PUBLIC_ so the client can init Firebase.
const firebaseEnv: Record<string, string> = {};
if (process.env.FIREBASE_WEBAPP_CONFIG && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  try {
    const cfg = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    if (cfg.apiKey) firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY = cfg.apiKey;
    if (cfg.authDomain) firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = cfg.authDomain;
    if (cfg.projectId) firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID = cfg.projectId;
    if (cfg.storageBucket) firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = cfg.storageBucket;
    if (cfg.messagingSenderId) firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = cfg.messagingSenderId;
    if (cfg.appId) firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID = cfg.appId;
  } catch {
    // ignore parse errors
  }
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    ...firebaseEnv,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:9002",
        "injaz.goldinkollar.com",
        "studio--injaz-assistant.us-central1.hosted.app",
      ],
    },
  },
};

export default nextConfig;
