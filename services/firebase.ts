import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD-77ZR4fXu6jVv2BalB-SCtOEECMbRp6s",
  authDomain: "kreochat-fa974.firebaseapp.com",
  projectId: "kreochat-fa974",
  storageBucket: "kreochat-fa974.firebasestorage.app",
  messagingSenderId: "497215373710",
  appId: "1:497215373710:web:dec3e0413f7c623284a4df",
  measurementId: "G-HBEH5157ZQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Rules for Reference (Not executable code, but requested):
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow create: if request.auth != null; // Validation happens in code via batch
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null; // Ideally check parent participants
    }
  }
}
*/
