import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCamera, FaUser, FaPhone, FaEnvelope, FaPen, FaCheck, FaMoon, FaSun, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import { uploadToCloudinary } from '../services/cloudinary';

interface ProfileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile | null;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose, userProfile }) => {
    // ... hooks remain same
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form States
    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [about, setAbout] = useState(userProfile?.about || '');
    const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');

    // Reset form when profile changes or drawer opens
    React.useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setAbout(userProfile.about || '');
            setPhoneNumber(userProfile.phoneNumber || '');
        }
    }, [userProfile, isOpen]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                displayName,
                about,
                phoneNumber
            });
            showToast("Profile updated!", "success");
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            showToast("Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setLoading(true);
        try {
            const uploaded = await uploadToCloudinary(file);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                photoURL: uploaded.secure_url
            });
            showToast("Profile photo updated!", "success");
        } catch (error) {
            showToast("Failed to upload photo", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!userProfile) return null;

    // Helper for fields
    const ProfileField = ({ label, value, icon, editable, onChange, type = "text", multiline = false }: any) => (
        <div className="group space-y-1.5">
            <label className="text-xs font-bold text-md-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>
            <div className={`relative flex items-center transition-all duration-300 ${editable ? 'ring-2 ring-emerald-500/50 bg-md-surface-variant/20' : 'bg-md-surface-variant/5 border border-md-outline/10'} rounded-2xl overflow-hidden`}>
                <div className={`pl-4 pr-3 ${editable ? 'text-emerald-500' : 'text-md-on-surface-variant/50'}`}>
                    {icon}
                </div>
                {editable ? (
                    multiline ? (
                        <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-transparent p-3 outline-none text-md-on-surface dark:text-md-dark-on-surface min-h-[48px] resize-none"
                            rows={type === 'about' ? 2 : 1}
                        />
                    ) : (
                        <input
                            type={type}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-transparent p-3 outline-none text-md-on-surface dark:text-md-dark-on-surface"
                        />
                    )
                ) : (
                    <div className="w-full p-3 text-md-on-surface dark:text-md-dark-on-surface font-medium truncate">
                        {value || <span className="opacity-40 italic">Not set</span>}
                    </div>
                )}
            </div>
        </div>
    );

    // Use React Portal to render outside of the transformed parent in ChatInterface
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
                    />

                    {/* Drawer Container */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-0 left-0 h-[100dvh] w-[85%] max-w-[400px] bg-md-surface dark:bg-[#111b21] z-[9999] shadow-2xl flex flex-col border-r border-white/5 font-display"
                    >
                        {/* Close Button - Fixed/Absolute relative to drawer, outside scroll area for easy access */}
                        <div className="absolute top-0 right-0 p-4 z-50 pt-safe-top">
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10 shadow-lg"
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar">

                            {/* Header Image - Now INSIDE scroll area so avatar can overlap it without clipping */}
                            <div className="h-44 relative shrink-0 w-full">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 animate-gradient-xy" />
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                            </div>

                            {/* Profile Info */}
                            <div className="relative px-6 pb-6 pt-0">

                                {/* Avatar - Overlapping Header */}
                                <div className="relative -mt-20 mb-6 flex flex-col items-center">
                                    <div className="group relative w-36 h-36 rounded-full p-1 bg-md-surface dark:bg-[#111b21] ring-1 ring-white/5 shadow-2xl z-10">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-md-surface-variant relative">
                                            <img
                                                src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.username}&background=random`}
                                                alt="Profile"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <span className="text-white drop-shadow-md flex items-center justify-center">
                                                    <FaCamera size={24} />
                                                </span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={loading} />
                                            </label>
                                        </div>
                                        {/* Edit Badge (Mobile friendly) */}
                                        <label className="absolute bottom-1 right-1 p-2.5 bg-emerald-500 text-white rounded-full shadow-lg md:hidden">
                                            <FaCamera size={14} />
                                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={loading} />
                                        </label>
                                    </div>
                                </div>

                                {/* Name & Username */}
                                <div className="text-center mb-8 space-y-2">
                                    <h2 className="text-2xl font-bold text-md-on-surface dark:text-white tracking-tight">
                                        {userProfile.displayName}
                                    </h2>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 inline-block px-3 py-1 rounded-full text-sm">
                                        @{userProfile.username}
                                    </p>
                                </div>



                                {/* Actions Header */}
                                <div className="flex justify-between items-center mb-6 px-1">
                                    <h3 className="text-sm font-bold text-md-on-surface-variant/80 uppercase tracking-widest">Personal Info</h3>
                                    <button
                                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${isEditing
                                            ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                            : 'bg-md-surface-variant/50 text-md-on-surface hover:bg-md-surface-variant'
                                            }`}
                                        disabled={loading}
                                    >
                                        {isEditing ? <><FaCheck /> Save</> : <><FaPen /> Edit</>}
                                    </button>
                                </div>

                                {/* Fields */}
                                <div className="space-y-6">
                                    <ProfileField
                                        label="Display Name"
                                        value={displayName}
                                        icon={<FaUser />}
                                        editable={isEditing}
                                        onChange={setDisplayName}
                                    />

                                    <ProfileField
                                        label="About"
                                        value={about}
                                        icon={<FaPen />}
                                        editable={isEditing}
                                        onChange={setAbout}
                                        multiline={true}
                                    />

                                    <ProfileField
                                        label="Phone"
                                        value={phoneNumber}
                                        icon={<FaPhone />}
                                        editable={isEditing}
                                        onChange={setPhoneNumber}
                                        type="tel"
                                    />

                                    <ProfileField
                                        label="Email"
                                        value={userProfile.email}
                                        icon={<FaEnvelope />}
                                        editable={false}
                                    />
                                </div>

                                <hr className="my-8 border-md-outline/10" />

                                {/* Settings Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={toggleTheme}
                                        className="w-full p-4 rounded-2xl bg-md-surface-variant/20 hover:bg-md-surface-variant/40 transition-all flex items-center justify-between group"
                                    >
                                        <span className="flex items-center gap-3 font-medium text-md-on-surface dark:text-gray-200">
                                            <span className="p-2 rounded-full bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                {theme === 'dark' ? <FaSun /> : <FaMoon />}
                                            </span>
                                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                        </span>
                                        <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : ''}`} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={logout}
                                        className="w-full p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-3 font-medium group"
                                    >
                                        <span className="p-2 rounded-full bg-red-500/10 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <FaSignOutAlt />
                                        </span>
                                        Sign Out
                                    </button>
                                </div>

                                <div className="h-8"></div>

                                {/* Version Info */}
                                <div className="text-center pb-4">
                                    <p className="text-xs text-md-on-surface-variant/30 font-mono">KreoChat v1.0.0 • E2EE Secured</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ProfileDrawer;
