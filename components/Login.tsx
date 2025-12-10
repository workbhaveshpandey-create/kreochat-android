import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Navigate } from 'react-router-dom';
import { FaGoogle, FaMoon, FaSun, FaShieldAlt, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

// Custom Minimalist Brand Logo
const KreoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M20 20C20 12.268 26.268 6 34 6H66C73.732 6 80 12.268 80 20V58C80 65.732 73.732 72 66 72H50L30 88V72H20C12.268 72 6 65.732 6 58V20Z"
      className="fill-md-primary dark:fill-md-dark-primary"
      fillOpacity="0.15"
    />
    <path
      d="M30 30L55 50L30 70"
      className="stroke-md-primary dark:stroke-md-dark-primary"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="70"
      cy="30"
      r="6"
      className="fill-md-primary dark:fill-md-dark-primary"
    />
  </svg>
);

const Login: React.FC = () => {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const isMobile = Capacitor.isNativePlatform();

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
    setIsSigningIn(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    setError('');

    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await signUpWithEmail(email, password, username);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
    setIsSigningIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-surface dark:bg-md-dark-surface transition-colors">
        <div className="w-12 h-12 border-4 border-md-primary/30 border-t-md-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-md-surface-variant/20 dark:bg-[#050505] flex items-center justify-center p-4 transition-colors duration-500">

      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-md-primary/5 dark:bg-md-dark-primary/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-md-secondary/5 dark:bg-md-dark-secondary/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[6000ms]" />
      </div>

      {/* Theme Toggle (Top Right) */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-md-surface dark:bg-md-dark-surface shadow-lg border border-md-outline/10 text-md-on-surface dark:text-md-dark-on-surface transition-colors"
      >
        {theme === 'dark' ? <div className="text-lg"><FaSun /></div> : <div className="text-lg"><FaMoon /></div>}
      </motion.button>

      {/* Main Login Card */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
        className="w-full max-w-[440px] bg-md-surface dark:bg-[#121212] rounded-[36px] shadow-2xl p-10 md:p-12 relative z-10 border border-white/40 dark:border-white/5 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center text-center">

          {/* Logo Section */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-md-primary/10 dark:bg-md-dark-primary/20 blur-2xl rounded-full" />
            <KreoLogo className="w-24 h-24 drop-shadow-lg relative z-10" />
          </motion.div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl font-display font-bold text-md-on-surface dark:text-md-dark-on-surface mb-3 tracking-tight">
              KreoChat
            </h1>
            <p className="text-lg text-md-on-surface-variant dark:text-md-dark-on-surface-variant font-normal leading-relaxed mb-10">
              Your conversations, reimagined.<br />
              <span className="text-sm opacity-70">Simple. Secure. Real-time.</span>
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Platform-specific Auth UI */}
          {isMobile ? (
            <>
              {/* Email/Password Form for Mobile */}
              <motion.form
                onSubmit={handleEmailAuth}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full space-y-4"
              >
                {isSignUp && (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant/50"><FaUser /></span>
                    <input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={isSignUp}
                      className="w-full bg-md-surface-variant/20 dark:bg-white/5 text-md-on-surface dark:text-white pl-12 pr-4 py-4 rounded-2xl outline-none border border-md-outline/20 focus:border-md-primary transition-colors"
                    />
                  </div>
                )}

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant/50"><FaEnvelope /></span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-md-surface-variant/20 dark:bg-white/5 text-md-on-surface dark:text-white pl-12 pr-4 py-4 rounded-2xl outline-none border border-md-outline/20 focus:border-md-primary transition-colors"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant/50"><FaLock /></span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-md-surface-variant/20 dark:bg-white/5 text-md-on-surface dark:text-white pl-12 pr-4 py-4 rounded-2xl outline-none border border-md-outline/20 focus:border-md-primary transition-colors"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isSigningIn}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-md-primary dark:bg-md-dark-primary text-md-on-primary dark:text-white py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-md-primary/20 transition-all disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    isSignUp ? 'Sign Up' : 'Sign In'
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-sm text-md-on-surface-variant dark:text-gray-400 hover:text-md-primary transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </motion.form>
            </>
          ) : (
            <>
              {/* Google Button for Web */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="w-full relative overflow-hidden group bg-md-primary dark:bg-md-dark-primary text-md-on-primary dark:text-md-dark-on-primary py-4 px-6 rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-md-primary/20 flex items-center justify-center gap-3"
              >
                {isSigningIn ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="text-xl"><FaGoogle /></div>
                    <span className="font-display tracking-wide">Continue with Google</span>
                  </>
                )}
                {/* Ripple Effect Overlay */}
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-2xl" />
              </motion.button>

              {/* Security Note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-md-on-surface-variant/50 dark:text-md-dark-on-surface-variant/50 uppercase tracking-widest"
              >
                <div className="text-sm"><FaShieldAlt /></div>
                <span>End-to-End Encrypted</span>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>

      {/* Footer Copyright */}
      <div className="absolute bottom-6 text-[10px] text-md-on-surface-variant/30 dark:text-md-dark-on-surface-variant/30 font-medium tracking-wider">
        © 2025 KREOCHAT INC.
      </div>
    </div>
  );
};

export default Login;