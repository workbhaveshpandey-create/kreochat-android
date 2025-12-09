import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../services/firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';

const EMOJIS = ['🐶', '🐱', '🐼', '🐨', '🐸', '🦄', '🐙', '🦋', '🐞', '🦖', '🌟'];

const ProfileSetup: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // UseEffect for checking profile existence
  React.useEffect(() => {
    if (userProfile?.username) {
      navigate('/');
    }
  }, [userProfile, navigate]);

  if (userProfile?.username) {
    return null; // Redirecting...
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (username.length < 3) return setError('Username must be at least 3 characters.');
    if (phoneNumber.length < 6) return setError('Please enter a valid phone number.');

    setIsSubmitting(true);
    setStatusMsg("Creating profile...");

    try {
      const usernameRef = doc(db, 'usernames', username);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        setError('Username taken. Choose another.');
        showToast("Username already exists", 'error');
        setIsSubmitting(false);
        setStatusMsg('');
        return;
      }

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const searchKeywords = [];
      for (let i = 1; i <= username.length; i++) searchKeywords.push(username.substring(0, i));

      const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

      batch.set(userRef, {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email,
        photoURL: user.photoURL || null,
        phoneNumber,
        username,
        about: 'Hey there! I am using KreoChat',
        searchKeywords,
        emoji: randomEmoji,
        createdAt: serverTimestamp(),
      });

      batch.set(usernameRef, { uid: user.uid });
      await batch.commit();

      showToast("Profile created successfully!", 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Setup failed. Try again.');
      showToast("Setup failed.", 'error');
      setIsSubmitting(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-md-surface-variant dark:bg-[#0f1214] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-md-surface dark:bg-md-dark-surface w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-md-outline/10 p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-md-on-surface dark:text-md-dark-on-surface">Welcome, {user?.displayName}</h2>
          <p className="text-md-on-surface-variant dark:text-md-dark-on-surface-variant mt-2">Let's finish setting up your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Username Field */}
          <div className="relative group">
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              className="peer w-full bg-transparent border border-md-outline/40 dark:border-md-dark-outline/40 rounded-xl px-4 py-3.5 text-md-on-surface dark:text-md-dark-on-surface outline-none focus:border-md-primary dark:focus:border-md-dark-primary focus:ring-1 focus:ring-md-primary dark:focus:ring-md-dark-primary transition-all placeholder-transparent"
              placeholder="Username"
              id="username"
              required
            />
            <label
              htmlFor="username"
              className="absolute left-3 -top-2.5 bg-md-surface dark:bg-md-dark-surface px-1 text-sm text-md-on-surface-variant dark:text-md-dark-on-surface-variant transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-md-on-surface-variant/70 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-md-primary dark:peer-focus:text-md-dark-primary"
            >
              Username (Unique)
            </label>
          </div>

          {/* Phone Field */}
          <div className="relative group">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="peer w-full bg-transparent border border-md-outline/40 dark:border-md-dark-outline/40 rounded-xl px-4 py-3.5 text-md-on-surface dark:text-md-dark-on-surface outline-none focus:border-md-primary dark:focus:border-md-dark-primary focus:ring-1 focus:ring-md-primary dark:focus:ring-md-dark-primary transition-all placeholder-transparent"
              placeholder="Phone"
              id="phone"
              required
            />
            <label
              htmlFor="phone"
              className="absolute left-3 -top-2.5 bg-md-surface dark:bg-md-dark-surface px-1 text-sm text-md-on-surface-variant dark:text-md-dark-on-surface-variant transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-md-on-surface-variant/70 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-md-primary dark:peer-focus:text-md-dark-primary"
            >
              Phone Number
            </label>
          </div>

          {error && (
            <div className="bg-md-primary/10 dark:bg-md-dark-primary/10 p-3 rounded-lg flex items-center gap-3 text-xs text-md-primary dark:text-md-dark-primary border border-md-primary/20">
              <span className="text-lg flex items-center justify-center"><FaShieldAlt /></span>
              <span>We are generating a secure profile for you.</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full bg-md-primary dark:bg-md-dark-primary text-md-on-primary dark:text-md-dark-on-primary font-medium py-3.5 rounded-full shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>{statusMsg || 'Processing...'}</span>
              </>
            ) : 'Complete Setup'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;