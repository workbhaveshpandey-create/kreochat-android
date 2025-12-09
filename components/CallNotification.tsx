import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MdCall, MdCallEnd, MdVideocam } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

interface CallData {
    id: string;
    callerId: string;
    callerName: string;
    callerPhotoURL?: string;
    receiverId: string;
    roomId: string;
    status: 'calling' | 'accepted' | 'rejected' | 'ended';
    createdAt: any;
}

const CallNotification: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

    useEffect(() => {
        if (!user) return;

        // Listen for incoming calls where I am the receiver and status is 'calling'
        const q = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'calling'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docData = snapshot.docs[0];
                setIncomingCall({ id: docData.id, ...docData.data() } as CallData);
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (incomingCall) {
            // Attempt to play sound (may be blocked if no user interaction yet)
            audioRef.current?.play().catch(() => {
                // If blocked, we rely on the visual notification
                console.log("Audio autoplay blocked - waiting for interaction");
            });

            // Request permission if not already granted/denied
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            // Trigger System Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                // Using a try-catch for notification creation
                try {
                    // Check if page is hidden OR if user is focused elsewhere
                    if (document.visibilityState === 'hidden' || !document.hasFocus()) {
                        const notification = new Notification(`Incoming Video Call`, {
                            body: `${incomingCall.callerName} is calling you...`,
                            icon: '/icon.png', // Ensure this path is valid
                            tag: 'incoming-call',
                            requireInteraction: true,
                            silent: false // We are playing sound manually, but this allows system vibration
                        });

                        notification.onclick = () => {
                            window.focus();
                            notification.close();
                        };
                    }
                } catch (e) {
                    console.error("Notification trigger failed", e);
                }
            }

        } else {
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    }, [incomingCall]);

    const handleAccept = async () => {
        if (!incomingCall) return;
        audioRef.current?.pause();
        try {
            await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'accepted' });
            navigate(`/call/${incomingCall.roomId}`);
            setIncomingCall(null);
        } catch (error) {
            console.error("Error accepting call:", error);
        }
    };

    const handleDecline = async () => {
        if (!incomingCall) return;
        audioRef.current?.pause();
        try {
            await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
            setIncomingCall(null);
        } catch (error) {
            console.error("Error rejecting call:", error);
        }
    };

    // Helper: Initial check for Mobile responsiveness
    const isMobile = window.innerWidth < 768;

    return (
        <AnimatePresence>
            {incomingCall && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    // Fix: Increased width safety margins, adjusted top positioning
                    className="fixed top-4 md:top-14 left-0 md:left-1/2 md:transform md:-translate-x-1/2 z-[9999] w-full md:w-[95%] md:max-w-lg px-2 md:px-0"
                >
                    <div className="bg-[#1f2c34] dark:bg-[#1f2c34] text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3 md:gap-4">

                        {/* Caller Info Section */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Avatar */}
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/20">
                                {incomingCall.callerPhotoURL ? (
                                    <img src={incomingCall.callerPhotoURL} alt="Caller" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold bg-emerald-600 text-white">
                                        {incomingCall.callerName.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Text Info */}
                            <div className="min-w-0">
                                <h3 className="font-bold text-sm md:text-lg truncate leading-tight">{incomingCall.callerName}</h3>
                                <p className="text-xs md:text-sm text-white/70 flex items-center gap-1 mt-0.5">
                                    <span className="shrink-0 flex items-center"><MdVideocam /></span>
                                    <span className="truncate">Incoming Video Call...</span>
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <button
                                onClick={handleDecline}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg active:scale-95"
                                title="Decline"
                            >
                                <div className="md:w-6 md:h-6 md:flex md:items-center md:justify-center">
                                    <MdCallEnd size={20} />
                                </div>
                            </button>
                            <button
                                onClick={handleAccept}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg active:scale-95 animate-pulse"
                                title="Accept"
                            >
                                <div className="md:w-6 md:h-6 md:flex md:items-center md:justify-center">
                                    <MdCall size={20} />
                                </div>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CallNotification;
