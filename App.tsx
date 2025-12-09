import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import ProfileSetup from './components/ProfileSetup';
import ChatInterface from './components/ChatInterface';
import CallPage from './components/CallPage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './services/firebase';
import CallNotification from './components/CallNotification';
import LoadingScreen from './components/LoadingScreen';

// Online Status Heartbeat
const Heartbeat: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateStatus = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          lastSeen: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to update heartbeat", e);
      }
    };

    // Update immediately and then every minute
    updateStatus();
    const interval = setInterval(updateStatus, 60000);

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return null;
};

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userProfile } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" />;

  // If user exists but no profile, force them to setup, unless they are already there
  if (!userProfile && window.location.hash !== '#/setup-profile') {
    return <Navigate to="/setup-profile" />;
  }

  return (
    <>
      <Heartbeat />
      <CallNotification />
      {children}
    </>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup-profile" element={
        <ProtectedRoute>
          <ProfileSetup />
        </ProtectedRoute>
      } />
      <Route path="/call/:roomId" element={
        <ProtectedRoute>
          <CallPage />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <ChatInterface />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;