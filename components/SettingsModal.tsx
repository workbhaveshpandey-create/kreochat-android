import React from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaEnvelope, FaPhone, FaUser, FaQuoteLeft } from 'react-icons/fa';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile | null;
}

const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userProfile }) => {
    if (!userProfile) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-md-surface dark:bg-md-dark-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-md-outline/10 text-md-on-surface dark:text-md-dark-on-surface">

                            {/* Header / Banner */}
                            <div className="h-32 bg-gradient-to-r from-md-primary to-md-secondary dark:from-md-dark-primary dark:to-md-dark-secondary relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Profile Content */}
                            <div className="px-6 pb-8 relative">
                                {/* Avatar */}
                                <div className="relative -mt-16 mb-4 flex justify-center">
                                    <div className="w-32 h-32 rounded-full border-4 border-md-surface dark:border-md-dark-surface bg-md-surface dark:bg-md-dark-surface shadow-lg overflow-hidden flex items-center justify-center">
                                        {userProfile.photoURL ? (
                                            <img src={userProfile.photoURL} alt={userProfile.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-md-primary-container flex items-center justify-center text-4xl font-bold text-md-on-primary-container">
                                                {getInitials(userProfile.username || userProfile.displayName || 'User')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold">{userProfile.displayName}</h2>
                                    <p className="text-md-on-surface-variant dark:text-md-dark-on-surface-variant">@{userProfile.username}</p>
                                </div>

                                {/* Info Grid */}
                                <div className="space-y-4">

                                    {/* About */}
                                    <div className="p-4 rounded-2xl bg-md-surface-variant/50 dark:bg-md-dark-surface-variant/50 flex gap-4">
                                        <div className="mt-1 text-md-primary dark:text-md-dark-primary"><FaQuoteLeft /></div>
                                        <div>
                                            <p className="text-sm font-medium text-md-on-surface-variant dark:text-md-dark-on-surface-variant">About</p>
                                            <p className="text-md-on-surface dark:text-md-dark-on-surface">{userProfile.about || "Hey there! I am using KreoChat."}</p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="p-4 rounded-2xl bg-md-surface-variant/50 dark:bg-md-dark-surface-variant/50 flex items-center gap-4">
                                        <div className="text-md-primary dark:text-md-dark-primary text-xl"><FaEnvelope /></div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium text-md-on-surface-variant dark:text-md-dark-on-surface-variant">Email</p>
                                            <p className="text-md-on-surface dark:text-md-dark-on-surface truncate">{userProfile.email}</p>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="p-4 rounded-2xl bg-md-surface-variant/50 dark:bg-md-dark-surface-variant/50 flex items-center gap-4">
                                        <div className="text-md-primary dark:text-md-dark-primary text-xl"><FaPhone /></div>
                                        <div>
                                            <p className="text-sm font-medium text-md-on-surface-variant dark:text-md-dark-on-surface-variant">Phone</p>
                                            <p className="text-md-on-surface dark:text-md-dark-on-surface">{userProfile.phoneNumber || "Not set"}</p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
