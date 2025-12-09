import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { FaTimes, FaSearch, FaUserPlus, FaCircleNotch } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (user: UserProfile) => void;
    currentUserProfile: UserProfile | null;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectUser, currentUserProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const usersRef = collection(db, 'users');
            // Basic prefix search
            const q = query(
                usersRef,
                where('username', '>=', term.toLowerCase()),
                where('username', '<=', term.toLowerCase() + '\uf8ff'),
                limit(10)
            );

            const snapshot = await getDocs(q);
            const users: UserProfile[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as UserProfile;
                if (data.uid !== currentUserProfile?.uid) {
                    users.push(data);
                }
            });
            setSearchResults(users);
        } catch (e) {
            console.error("Search error", e);
        } finally {
            setIsSearching(false);
        }
    };

    const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-md-surface dark:bg-[#1e2224] rounded-3xl shadow-2xl overflow-hidden border border-md-outline/10"
                >
                    <div className="p-4 border-b border-md-outline/10 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-md-on-surface dark:text-md-dark-on-surface">New Chat</h2>
                        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-md-on-surface-variant dark:text-md-dark-on-surface-variant">
                            <FaTimes />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="bg-md-surface-variant dark:bg-md-dark-surface-variant rounded-full flex items-center px-4 py-3 transition-colors mb-4">
                            <div className="text-md-on-surface-variant dark:text-md-dark-on-surface-variant pr-3">
                                {isSearching ? <span className="animate-spin"><FaCircleNotch /></span> : <FaSearch />}
                            </div>
                            <input
                                type="text"
                                placeholder="Search by username..."
                                className="bg-transparent border-none outline-none w-full text-md-on-surface dark:text-md-dark-on-surface placeholder-md-on-surface-variant/50 font-medium"
                                value={searchTerm}
                                autoFocus
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {searchResults.length === 0 && searchTerm.length > 2 && !isSearching && (
                                <div className="text-center py-8 text-md-on-surface-variant opacity-60">
                                    No users found
                                </div>
                            )}
                            {searchResults.length === 0 && searchTerm.length <= 2 && (
                                <div className="text-center py-8 text-md-on-surface-variant opacity-60">
                                    Type at least 3 characters to search
                                </div>
                            )}

                            {searchResults.map(user => (
                                <motion.button
                                    key={user.uid}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        onSelectUser(user);
                                        onClose();
                                    }}
                                    className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-md-surface-variant dark:hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-12 h-12 rounded-full bg-md-primary-container dark:bg-md-dark-primary-container flex-shrink-0 flex items-center justify-center text-sm font-bold text-md-on-primary-container dark:text-md-dark-on-primary-container">
                                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full rounded-full object-cover" /> : getInitials(user.username)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-md-on-surface dark:text-md-dark-on-surface truncate">{user.username}</h3>
                                        <p className="text-xs text-md-on-surface-variant dark:text-md-dark-on-surface-variant truncate">{user.about || 'No bio available'}</p>
                                    </div>
                                    <span className="text-md-primary dark:text-md-dark-primary bg-md-primary/10 p-2 rounded-full"><FaUserPlus /></span>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NewChatModal;
