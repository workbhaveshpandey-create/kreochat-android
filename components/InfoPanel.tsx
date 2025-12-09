import React, { useState } from 'react';
import { UserProfile } from '../types';
import { FaUser, FaLock } from 'react-icons/fa';
import { format } from 'date-fns';

interface InfoPanelProps {
    activeUser: UserProfile | null;
    activeChatId?: string | null;
    onClose?: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ activeUser, activeChatId, onClose }) => {
    const [isProfileImageOpen, setIsProfileImageOpen] = useState(false);

    if (!activeUser) {
        return (
            <div className="w-[300px] h-full flex flex-col p-6">
                <div className="flex items-center gap-3 mb-8">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-md-primary to-emerald-400">Activity</span>
                </div>

                {/* Dashboard Mode Content */}
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-md-surface dark:bg-[#202c33] border border-white/5">
                        <h3 className="text-sm font-bold text-md-on-surface dark:text-gray-200 mb-2">System Status</h3>
                        <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 p-2 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            All systems operational
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-md-surface dark:bg-[#202c33] border border-white/5">
                        <h3 className="text-sm font-bold text-md-on-surface dark:text-gray-200 mb-3">Recent Security</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-xs text-gray-400">
                                <div className="p-1.5 bg-md-primary/10 text-md-primary rounded-lg mt-0.5"><FaLock /></div>
                                <div>
                                    <p className="text-gray-300">Keys updated</p>
                                    <p className="opacity-60">2 hours ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active Chat Mode
    return (
        <div className="w-[320px] h-full flex flex-col overflow-y-auto custom-scrollbar relative">

            <div className="p-8 flex flex-col items-center border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-md-primary/10 to-transparent"></div>

                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-md-primary to-emerald-400 z-10 mb-4 shadow-lg shadow-md-primary/20">
                    <div
                        className="w-full h-full rounded-full border-4 border-md-surface dark:border-[#111b21] overflow-hidden bg-md-surface-variant cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => activeUser.photoURL && setIsProfileImageOpen(true)}
                    >
                        {activeUser.photoURL ? (
                            <img src={activeUser.photoURL} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-md-on-surface-variant"><FaUser /></div>
                        )}
                    </div>
                </div>

                <h2 className="text-xl font-bold text-md-on-surface dark:text-gray-100 mb-1">{activeUser.username}</h2>
                <p className="text-sm text-md-primary dark:text-md-dark-primary font-medium">{activeUser.email || 'No email provided'}</p>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="flex gap-4 mt-6 w-full">
                    <div className="flex-1 p-3 bg-md-surface dark:bg-[#202c33] rounded-xl text-center border border-white/5">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Joined</p>
                        <p className="text-sm font-medium text-gray-300">{activeUser.createdAt ? format(activeUser.createdAt.toDate(), 'MMM yyyy') : '-'}</p>
                    </div>
                    <div className="flex-1 p-3 bg-md-surface dark:bg-[#202c33] rounded-xl text-center border border-white/5">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                        <p className="text-sm font-medium text-emerald-400">Trusted</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">About</h3>
                    <p className="text-sm text-gray-400 leading-relaxed italic border-l-2 border-md-primary/30 pl-3">
                        {activeUser.about || "Hey there! I am using KreoChat."}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-md-primary/5 border border-md-primary/10 mt-auto">
                    <div className="flex items-center gap-3 text-md-primary mb-2">
                        <FaLock />
                        <span className="text-sm font-bold">End-to-End Encrypted</span>
                    </div>
                    <p className="text-xs text-md-primary/70 leading-relaxed">
                        Messages and calls with this user are secured with end-to-end encryption.
                    </p>
                </div>
            </div>

            {/* Profile Image Lightbox */}
            {isProfileImageOpen && activeUser.photoURL && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsProfileImageOpen(false)}
                >
                    <div className="relative max-w-full max-h-full">
                        <button
                            onClick={() => setIsProfileImageOpen(false)}
                            className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={activeUser.photoURL}
                            alt={activeUser.username}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default InfoPanel;
