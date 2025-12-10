import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { UserProfile } from '../types';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Listen to the user's profile in real-time
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUserProfile(profile);

            // AUTO-SYNC: If Auth has photo but Firestore doesn't, update it.
            if (currentUser.photoURL && !profile.photoURL) {
              console.log("Auto-syncing photoURL from Google Auth...");
              try {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(userDocRef, {
                  photoURL: currentUser.photoURL
                });
              } catch (e) {
                console.error("Failed to sync photoURL", e);
              }
            }
          } else {
            setUserProfile(null); // Auth exists, but Profile doesn't (needs setup)
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });

        return () => unsubscribeFirestore();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Show alert for mobile users
        alert('Mobile Google Sign-In requires additional Firebase configuration. Please use the web version for now or contact support.');
        return;
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
