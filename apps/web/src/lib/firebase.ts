import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;

export function isFirebaseConfigured(): boolean {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
}

function getApp(): FirebaseApp {
  if (!_app) {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.');
    }
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      _app = initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      });
    }
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}
