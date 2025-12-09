import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, Message, ChatMetadata, MessageContent, MessageType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../services/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    updateDoc,
    doc,
    Timestamp,
    getDoc,
    writeBatch,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';
import {
    MdMoreVert,
    MdAttachFile,
    MdSend,
    MdImage,
    MdVideocam,
    MdDescription,
    MdMic,
    MdClose,
    MdDownload,
    MdVideoCall,
    MdDelete,
    MdReply,
    MdEmojiEmotions,
    MdOutlineCleaningServices,
    MdEdit,
    MdCameraAlt
} from 'react-icons/md';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { FaLock, FaFile, FaCheck, FaCheckDouble, FaArrowLeft } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
// import { getLocalPrivateKey, importPrivateKey, unwrapSessionKey, encryptMessage, decryptMessage } from '../services/e2ee'; // REMOVED
import { uploadToCloudinary } from '../services/cloudinary';
import { useNavigate } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';

interface ChatWindowProps {
    chatId: string;
    recipient: UserProfile;
    onBack?: () => void;
    onProfileClick?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, recipient, onBack, onProfileClick }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatMetadata, setChatMetadata] = useState<ChatMetadata | null>(null);
    const [inputText, setInputText] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    // const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null); // REMOVED
    // const [isKeyLoading, setIsKeyLoading] = useState(false); // REMOVED

    // UI States
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
    const [recipientStatus, setRecipientStatus] = useState<{ online: boolean, lastSeen?: string }>({ online: false });
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isRecipientTyping]);

    // 0. Recipient Online/Typing Status Listener
    useEffect(() => {
        if (!recipient.uid || !chatId) return;

        // Listen for User Online Status
        const userUnsub = onSnapshot(doc(db, 'users', recipient.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                const now = Timestamp.now();
                const lastSeen = data.lastSeen;

                let isOnline = false;
                let lastSeenText = '';

                if (lastSeen) {
                    const diff = (now.toMillis() - lastSeen.toMillis()) / 1000 / 60; // minutes
                    isOnline = diff < 2; // Considered online if active in last 2 mins

                    if (!isOnline) {
                        const date = lastSeen.toDate();
                        if (isToday(date)) lastSeenText = `Last seen today at ${format(date, 'HH:mm')}`;
                        else if (isYesterday(date)) lastSeenText = `Last seen yesterday at ${format(date, 'HH:mm')}`;
                        else lastSeenText = `Last seen ${format(date, 'dd/MM/yy')}`;
                    }
                }
                setRecipientStatus({ online: isOnline, lastSeen: lastSeenText });
            }
        });

        // Listen for Typing Status on Chat Doc
        const chatUnsub = onSnapshot(doc(db, 'chats', chatId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as ChatMetadata;
                setChatMetadata(data);
                // Typing status handling would go here with a dedicated subcollection or listener
            }
        });

        return () => {
            userUnsub();
            chatUnsub();
        };
    }, [recipient.uid, chatId]);


    // 1. Fetch and Decrypt Session Key --> REMOVED


    // 2. Listen for Messages & Handle Read Receipts
    useEffect(() => {
        if (!chatId || !user) return;

        const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(rawMessages);

            // Batch Update Read Receipts
            const unreadMessages = rawMessages.filter(
                m => m.senderId !== user.uid && m.status !== 'read' && m.id
            );

            if (unreadMessages.length > 0) {
                const batch = writeBatch(db);
                unreadMessages.forEach(msg => {
                    if (msg.id) {
                        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                        batch.update(msgRef, { status: 'read' });
                    }
                });
                batch.commit().catch(e => console.error("Read receipt failed", e));
            }
        });
        return () => unsubscribe();
    }, [chatId, user]);


    // Filter messages based on clearedAt and deletedFor
    const visibleMessages = useMemo(() => {
        if (!user) return [];
        const clearedTime = chatMetadata?.clearedAt?.[user.uid];
        return messages.filter(msg => {
            // Filter out cleared messages
            if (clearedTime && msg.timestamp && msg.timestamp.toMillis() <= clearedTime.toMillis()) {
                return false;
            }
            // Filter out "delete for me" messages
            if (msg.deletedFor?.includes(user.uid)) {
                return false;
            }
            return true;
        });
    }, [messages, chatMetadata, user]);

    const deleteMessage = async (msg: Message, forEveryone: boolean) => {
        if (!user || !chatId || !msg.id) return;
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);

        try {
            if (forEveryone) {
                // Mark as deleted for everyone (removes content, keeps placeholder)
                await updateDoc(msgRef, {
                    isDeleted: true,
                    text: '',
                    encryptedData: null,
                    iv: null,
                    fileUrl: null
                });
            } else {
                // Delete strictly for me (hides it locally)
                await updateDoc(msgRef, {
                    deletedFor: arrayUnion(user.uid)
                });
            }
            showToast("Message deleted", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to delete message", "error");
        }
    };

    const toggleReaction = async (msg: Message, emoji: string) => {
        if (!user || !chatId || !msg.id) return;
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
        const currentReactions = msg.reactions?.[emoji] || [];
        const hasReacted = currentReactions.includes(user.uid);

        try {
            if (hasReacted) {
                // Remove reaction
                await updateDoc(msgRef, {
                    [`reactions.${emoji}`]: arrayRemove(user.uid)
                });
            } else {
                // Add reaction
                await updateDoc(msgRef, {
                    [`reactions.${emoji}`]: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Reaction failed", error);
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setInputText(prev => prev + emojiData.emoji);
        // Don't close picker immediately, allows multi-select
    };

    // 3. Decryption Cache Logic --> REMOVED

    // --- Typing Logic ---
    const handleTyping = (text: string) => {
        setInputText(text);
        if (!user) return;

        const chatRef = doc(db, 'chats', chatId);

        // Set typing true immediately if not already
        updateDoc(chatRef, { [`typing.${user.uid}`]: true }).catch(() => { });

        // Clear timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set typing false after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            updateDoc(chatRef, { [`typing.${user.uid}`]: false }).catch(() => { });
        }, 2000);
    };

    // --- Sending Logic ---

    const sendMessagePayload = async (content: MessageContent) => {
        if (!user) return; // Removed sessionKey check

        try {
            // REMOVED ENCRYPTION
            // const payloadString = JSON.stringify(content);
            // const { encryptedData, iv } = await encryptMessage(payloadString, sessionKey);

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                // encryptedData, REMOVED
                // iv, REMOVED
                senderId: user.uid,
                timestamp: serverTimestamp(),
                type: content.type,
                status: 'sent',
                replyToId: replyingTo?.id || null,
                // Add fields directly
                text: content.text || null,
                fileUrl: content.fileUrl || null,
                fileName: content.fileName || null,
                mimeType: content.mimeType || null
            });

            setReplyingTo(null); // Clear reply state after sending

            // Determine preview text
            let preview = 'Message';
            if (content.type === 'image') preview = '📷 Image';
            else if (content.type === 'video') preview = '🎥 Video';
            else if (content.type === 'audio') preview = '🎤 Voice Message';
            else if (content.type === 'document') preview = '📄 Document';
            else preview = content.text || 'Message';

            await updateDoc(doc(db, 'chats', chatId), {
                updatedAt: serverTimestamp(),
                lastMessage: {
                    text: preview,
                    senderId: user.uid,
                    timestamp: Timestamp.now(),
                    unreadCount: 0,
                    type: content.type
                },
                [`typing.${user.uid}`]: false, // Stop typing when sent
                deletedIds: [] // Un-hide chat for everyone when a new message is sent
            });
        } catch (err) {
            console.error("Send failed", err);
            showToast("Failed to send message.", 'error');
        }
    };

    const handleSendText = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');

        // Edit Mode
        if (editingMessage && editingMessage.id) {
            try {
                const msgRef = doc(db, 'chats', chatId, 'messages', editingMessage.id);
                await updateDoc(msgRef, {
                    text: text,
                    editedAt: serverTimestamp()
                });
                setEditingMessage(null);
            } catch (err) {
                console.error("Edit failed", err);
                showToast("Failed to edit message", 'error');
            }
            return;
        }

        await sendMessagePayload({ type: 'text', text });
    };

    // --- File Upload Logic ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setShowAttachMenu(false);
        setIsUploading(true);

        try {
            const uploaded = await uploadToCloudinary(file);

            let msgType: MessageType = 'document';
            if (file.type.startsWith('image/')) msgType = 'image';
            else if (file.type.startsWith('video/')) msgType = 'video';
            else if (file.type.startsWith('audio/')) msgType = 'audio';

            await sendMessagePayload({
                type: msgType,
                fileUrl: uploaded.secure_url,
                fileName: file.name,
                mimeType: file.type,
                text: file.name
            });

        } catch (error) {
            showToast("Upload failed.", 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = (accept: string) => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = accept;
            fileInputRef.current.click();
        }
    };

    // --- Voice Recorder Logic ---

    const getSupportedMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg' // For Firefox
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ''; // Let browser default or fail gracefully
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : undefined;

            mediaRecorderRef.current = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const usedMimeType = mediaRecorderRef.current?.mimeType || mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: usedMimeType });

                if (audioBlob.size === 0) {
                    showToast("Recording failed: Empty audio.", 'error');
                    return;
                }

                // Decide extension based on mimeType
                let ext = 'webm';
                if (usedMimeType.includes('mp4')) ext = 'mp4';
                else if (usedMimeType.includes('ogg')) ext = 'ogg';

                const fileName = `voice_message.${ext}`;
                const audioFile = new File([audioBlob], fileName, { type: usedMimeType });

                setIsUploading(true);
                try {
                    const uploaded = await uploadToCloudinary(audioFile);

                    await sendMessagePayload({
                        type: 'audio',
                        fileUrl: uploaded.secure_url,
                        fileName: fileName,
                        mimeType: usedMimeType,
                        text: '🎤 Voice Message'
                    });
                } catch (e) {
                    showToast("Voice message failed", 'error');
                } finally {
                    setIsUploading(false);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error(err);
            showToast("Microphone access required", 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // --- Video Call Logic ---
    const startVideoCall = async () => {
        if (!user || !recipient.uid) return;

        // Deterministic Room ID: sort UIDs alphabetically and join with _
        const userIds = [user.uid, recipient.uid].sort();
        const roomId = `${userIds[0]}_${userIds[1]}`;

        try {
            // Create Call Document
            await addDoc(collection(db, 'calls'), {
                callerId: user.uid,
                callerName: user.displayName || 'User',
                callerPhotoURL: user.photoURL || '',
                receiverId: recipient.uid,
                roomId: roomId,
                status: 'calling',
                createdAt: serverTimestamp()
            });

            // Notify in chat
            await sendMessagePayload({
                type: 'text',
                text: '📞 Started a video call'
            });

            navigate(`/call/${roomId}`);
        } catch (error) {
            console.error("Failed to start call", error);
            showToast("Failed to start call", "error");
        }
    };

    // --- Render Helpers ---

    const renderContent = (content: MessageContent, isMe: boolean, isDeleted?: boolean) => {
        if (isDeleted) {
            return (
                <div className="flex items-center gap-2 italic opacity-60">
                    <span className="text-lg"><MdDelete /></span>
                    <span>This message was deleted</span>
                </div>
            );
        }

        switch (content.type) {
            case 'image':
                return (
                    <div className="mb-1 group cursor-pointer" onClick={() => content.fileUrl && setLightboxMedia({ url: content.fileUrl, type: 'image' })}>
                        <img
                            src={content.fileUrl}
                            alt={content.fileName}
                            className="rounded-lg max-w-full max-h-[300px] object-cover hover:opacity-95 transition-opacity"
                        />
                    </div>
                );
            case 'video':
                return (
                    <div className="mb-1 cursor-pointer relative group" onClick={() => content.fileUrl && setLightboxMedia({ url: content.fileUrl, type: 'video' })}>
                        <video src={content.fileUrl} className="rounded-lg max-w-full max-h-[300px]" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                            </div>
                        </div>
                    </div>
                );
            case 'audio':
                if (!content.fileUrl) {
                    return <div className="text-red-500 text-xs">⚠️ Audio URL missing</div>;
                }
                return <AudioPlayer src={content.fileUrl} isMe={isMe} />;
            case 'document':
                return (
                    <div
                        onClick={() => window.open(content.fileUrl, '_blank')}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    >
                        <div className="p-2 bg-md-surface dark:bg-md-dark-surface rounded-lg">
                            <span className="text-md-primary dark:text-md-dark-primary text-xl"><FaFile /></span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{content.fileName || 'Document'}</p>
                            <p className="text-sm font-medium truncate">{content.text}</p>
                            <p className="text-[10px] opacity-70 uppercase">{content.fileName?.split('.').pop() || 'FILE'}</p>
                        </div>
                        <span className="text-lg opacity-70"><MdDownload /></span>
                    </div>
                );
            default:
                if (!content.text) {
                    // Check if it's an old encrypted message that we can't read
                    return (
                        <div className="text-xs text-orange-500 font-mono break-all bg-orange-50 dark:bg-orange-900/20 p-2 rounded flex items-center gap-2">
                            <FaLock />
                            Encrypted Message (Legacy)
                        </div>
                    );
                }
                return (
                    <div>
                        <p className="break-words whitespace-pre-wrap">{content.text}</p>
                        {(content as any).isEdited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                    </div>
                );
        }
    };

    const renderStatus = (status?: string) => {
        if (status === 'read') return <span className="text-blue-400 text-[10px]"><FaCheckDouble /></span>;
        if (status === 'delivered') return <span className="text-md-on-primary/60 text-[10px]"><FaCheckDouble /></span>;
        return <span className="text-md-on-primary/60 text-[10px]"><FaCheck /></span>;
    };

    // Helper to get reply message content
    const getReplyContent = (replyId: string) => {
        const msg = messages.find(m => m.id === replyId);
        if (!msg) return null;

        // Simplified content extraction
        return {
            type: msg.type,
            text: msg.text || (msg.type === 'image' ? 'Image' : msg.type === 'audio' ? 'Audio' : 'File')
        };
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-md-surface dark:bg-md-dark-surface relative overflow-hidden">

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightboxMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <button
                            onClick={() => setLightboxMedia(null)}
                            className="absolute top-4 right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                        >
                            <span className="text-2xl"><MdClose /></span>
                        </button>
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-full max-h-full"
                        >
                            {lightboxMedia.type === 'image' ? (
                                <img src={lightboxMedia.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                            ) : (
                                <video src={lightboxMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileUpload}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-[72px] flex items-center justify-between px-6 bg-md-surface/80 dark:bg-[#111b21]/90 backdrop-blur-xl border-b border-md-outline/10 dark:border-white/5 z-30 transition-colors">
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Back Button (Mobile Only) */}
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 -ml-2 text-md-on-surface dark:text-md-dark-on-surface hover:bg-md-surface-variant/20 rounded-full transition-colors"
                    >
                        <FaArrowLeft />
                    </button>

                    <div
                        className="flex items-center gap-3 md:gap-4 cursor-pointer"
                        onClick={onProfileClick}
                    >
                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-md-primary to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-md-surface dark:bg-md-dark-surface overflow-hidden flex items-center justify-center text-xl border-2 border-transparent">
                                {recipient.photoURL ? <img src={recipient.photoURL} className="w-full h-full object-cover" /> : recipient.emoji}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-md-on-surface dark:text-md-dark-on-surface flex items-center gap-2">
                                {recipient.username}
                            </h2>
                            {/* Online Status / Typing */}
                            <div className="h-4 flex items-center">
                                {isRecipientTyping ? (
                                    <p className="text-xs text-md-primary dark:text-md-dark-primary font-bold animate-pulse">typing...</p>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {recipientStatus.online ? (
                                            <>
                                                <span className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                                <p className="text-xs text-md-on-surface-variant dark:text-md-dark-on-surface-variant font-medium">Online</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-md-on-surface-variant dark:text-md-dark-on-surface-variant font-medium opacity-80">{recipientStatus.lastSeen || 'Offline'}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={startVideoCall}
                        className="p-3 rounded-full hover:bg-md-surface-variant/20 dark:hover:bg-white/5 transition-all active:scale-95 text-md-on-surface-variant dark:text-md-dark-on-surface-variant"
                        title="Start Video Call"
                    >
                        <span className="text-2xl"><MdVideoCall /></span>
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to clear this chat? This will remove all messages for you.")) {
                                const chatRef = doc(db, 'chats', chatId);
                                updateDoc(chatRef, { [`clearedAt.${user?.uid}`]: serverTimestamp() });
                                showToast("Chat cleared", 'success');
                            }
                        }}
                        className="p-3 rounded-full hover:bg-md-surface-variant/20 dark:hover:bg-white/5 transition-all active:scale-95 text-md-on-surface-variant dark:text-md-dark-on-surface-variant"
                        title="Clear Chat"
                    >
                        <span className="text-xl"><MdOutlineCleaningServices /></span>
                    </button>
                </div>
            </div>

            {/* Messages */}
            {/* Messages */}
            <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 space-y-3 custom-scrollbar bg-md-surface-variant/5 dark:bg-[#0b141a]">

                <AnimatePresence initial={false}>
                    {visibleMessages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.uid;

                        // Construct content object directly from message fields
                        const content: MessageContent & { isEdited?: boolean } = {
                            type: msg.type || 'text',
                            text: msg.text,
                            fileUrl: msg.fileUrl || (msg as any).url, // Fallback for legacy
                            fileName: msg.fileName,
                            mimeType: msg.mimeType,
                            isEdited: !!msg.editedAt
                        };

                        const idProp = msg.id ? { id: `msg-${msg.id}` } : {};
                        const replyContent = msg.replyToId ? getReplyContent(msg.replyToId) : null;

                        return (
                            <motion.div
                                key={msg.id || idx}
                                {...idProp}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}
                            >
                                {/* Action Menu (Left for Me) */}
                                {isMe && !msg.isDeleted && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-2 self-center text-md-on-surface-variant/50">
                                        <button onClick={() => deleteMessage(msg, true)} title="Delete for Everyone" className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded"><MdDelete /></button>
                                        {msg.type === 'text' && <button onClick={() => { setEditingMessage(msg); setInputText(msg.text || ''); setReplyingTo(null); }} title="Edit" className="p-1 hover:text-md-primary hover:bg-md-primary/10 rounded"><MdEdit /></button>}
                                        <button onClick={() => { setReplyingTo(msg); setEditingMessage(null); }} title="Reply" className="p-1 hover:text-md-primary hover:bg-md-primary/10 rounded"><MdReply /></button>
                                        <button onClick={() => toggleReaction(msg, '❤️')} title="React" className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded"><MdEmojiEmotions /></button>
                                    </div>
                                )}

                                <div className={`max-w-[85%] md:max-w-[65%] px-4 py-2 md:px-5 md:py-2.5 shadow-sm text-[15px] leading-relaxed transition-all flex flex-col ${isMe
                                    ? 'bg-md-primary text-white rounded-[18px] rounded-tr-sm'
                                    : 'bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-[18px] rounded-tl-sm border border-gray-100 dark:border-white/5'
                                    }`}>

                                    {/* Reply Context */}
                                    {msg.replyToId && (
                                        <div
                                            className={`mb-2 rounded-lg p-2 text-xs border-l-2 cursor-pointer opacity-80 ${isMe ? 'bg-black/10 border-white/50' : 'bg-md-surface-variant/50 border-md-primary'} flex flex-col`}
                                            onClick={() => document.getElementById(`msg-${msg.replyToId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                        >
                                            <span className="font-bold opacity-90">Replying to...</span>
                                            <span className="truncate">{replyContent?.text || 'Message'}</span>
                                        </div>
                                    )}

                                    {renderContent(content, isMe, msg.isDeleted)}

                                    {/* Footer: Time & Status */}
                                    <div className={`flex items-center gap-1 mt-1 justify-end text-[10px] opacity-70 ${isMe ? 'text-white/80' : 'text-md-on-surface-variant/60'}`}>
                                        <span>{msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}</span>
                                        {isMe && !msg.isDeleted && renderStatus(msg.status)}
                                    </div>

                                    {/* Reactions */}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className="absolute -bottom-2 right-0 flex gap-0.5">
                                            {(Object.entries(msg.reactions) as [string, string[]][]).map(([emoji, uids]) => (
                                                uids.length > 0 && (
                                                    <span key={emoji} className="bg-md-surface dark:bg-md-dark-surface border border-md-outline/10 text-xs px-1 rounded-full shadow-sm">
                                                        {emoji} <span className="text-[9px] opacity-70">{uids.length}</span>
                                                    </span>
                                                )
                                            ))}
                                        </div>
                                    )}

                                </div>

                                {/* Action Menu (Right for Others) */}
                                {!isMe && !msg.isDeleted && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2 self-center text-md-on-surface-variant/50">
                                        <button onClick={() => toggleReaction(msg, '❤️')} title="React" className="p-1 hover:text-red-500 hover:bg-red-500/10 rounded"><MdEmojiEmotions /></button>
                                        <button onClick={() => setReplyingTo(msg)} title="Reply" className="p-1 hover:text-md-primary hover:bg-md-primary/10 rounded"><MdReply /></button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </AnimatePresence>
            </div>

            {/* Input Area */}
            {chatMetadata?.deletedIds?.includes(user?.uid || '') ? (
                <div className="p-4 bg-md-surface dark:bg-md-dark-surface border-t border-md-outline/10 text-center z-20">
                    <p className="text-sm text-md-on-surface-variant mb-2">You cannot message in this chat because you deleted it.</p>
                </div>
            ) : (
                <div className="bg-md-surface/80 dark:bg-[#111b21]/80 backdrop-blur-xl border-t border-md-outline/10 dark:border-white/5 z-20 pb-2 md:pb-4 pt-2">

                    {/* Reply Preview */}
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-md-surface-variant/20 dark:bg-black/20 p-2 rounded-lg mb-2 border-l-4 border-md-primary">
                            <div className="text-sm">
                                <span className="font-bold text-md-primary dark:text-md-dark-primary block">Replying to message</span>
                                <span className="text-md-on-surface-variant dark:text-md-dark-on-surface-variant truncate opacity-70">
                                    {replyingTo.text || (replyingTo.type !== 'text' ? `[${replyingTo.type}]` : '...')}
                                </span>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/10 rounded-full"><MdClose /></button>
                        </div>
                    )}

                    {/* Edit Preview */}
                    {editingMessage && (
                        <div className="flex items-center justify-between bg-md-surface-variant/20 dark:bg-black/20 p-2 rounded-lg mb-2 border-l-4 border-yellow-500">
                            <div className="text-sm">
                                <span className="font-bold text-yellow-600 dark:text-yellow-500 block">Editing message</span>
                                <span className="text-md-on-surface-variant dark:text-md-dark-on-surface-variant truncate opacity-70">
                                    {editingMessage.text}
                                </span>
                            </div>
                            <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="p-1 hover:bg-black/10 rounded-full text-lg"><MdClose /></button>
                        </div>
                    )}

                    <form onSubmit={handleSendText} className="flex gap-2 items-end relative bg-md-surface dark:bg-[#202c33] p-1.5 rounded-[24px] shadow-lg border border-md-outline/5 dark:border-white/5 mx-2 mb-2">
                        {/* Attachments Menu (Hidden while recording) */}
                        {!isRecording && (
                            <div className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                                    className={`p-3 rounded-full transition-all active:scale-95 ${showAttachMenu ? 'bg-md-primary text-white rotate-45' : 'text-md-on-surface-variant hover:bg-md-surface-variant/20 hover:text-md-primary'}`}
                                >
                                    <span className="text-xl flex"><MdAttachFile /></span>
                                </button>

                                <AnimatePresence>
                                    {showAttachMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-16 left-0 bg-md-surface dark:bg-[#1f2937] shadow-2xl rounded-2xl p-2 flex flex-col gap-1 min-w-[180px] border border-white/10 z-50 backdrop-blur-3xl"
                                        >
                                            <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-md-on-surface dark:text-gray-200 transition-colors">
                                                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><MdCameraAlt size={18} /></span> Camera
                                            </button>
                                            <button type="button" onClick={() => triggerFileSelect('image/*')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-md-on-surface dark:text-gray-200 transition-colors">
                                                <span className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><MdImage size={18} /></span> Photos
                                            </button>
                                            <button type="button" onClick={() => triggerFileSelect('video/*')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-md-on-surface dark:text-gray-200 transition-colors">
                                                <span className="p-2 bg-pink-500/20 text-pink-400 rounded-lg"><MdVideocam size={18} /></span> Videos
                                            </button>
                                            <button type="button" onClick={() => triggerFileSelect('*/*')} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium text-md-on-surface dark:text-gray-200 transition-colors">
                                                <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><MdDescription size={18} /></span> Documents
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {!isRecording && (
                            <div className="flex-1 flex items-center transition-all">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => handleTyping(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent border-none outline-none py-3 px-2 text-md-on-surface dark:text-gray-100 placeholder-gray-500 text-[15px] font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2 transition-colors mr-1 ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                >
                                    <span className="text-xl flex"><MdEmojiEmotions /></span>
                                </button>
                            </div>
                        )}

                        {/* Emoji Picker Popover */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-16 right-0 md:bottom-20 md:right-20 z-50 shadow-2xl rounded-2xl overflow-hidden w-full md:w-auto max-w-[100vw]">
                                <EmojiPicker onEmojiClick={handleEmojiClick} theme={undefined} width="100%" />
                            </div>
                        )}

                        {/* Mic / Send Button */}
                        {inputText.trim() || isUploading ? (
                            <button
                                type="submit"
                                disabled={isUploading || !inputText.trim()}
                                className="p-3 bg-md-primary hover:bg-md-primary/90 text-white rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group shrink-0 active:scale-95"
                            >
                                {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="text-xl flex"><MdSend /></span>
                                )}
                            </button>
                        ) : (
                            isRecording ? (
                                <div className="flex-1 flex items-center justify-between bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 p-1.5 pr-2 pl-4 rounded-[20px] animate-pulse shrink-0 mx-auto w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-red-500 text-sm font-mono font-bold">{formatTime(recordingTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={cancelRecording} className="p-2 text-red-500/70 hover:text-red-500 rounded-full transition-colors font-semibold text-xs uppercase hover:bg-red-500/10">Cancel</button>
                                        <button type="button" onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:scale-105 transition-transform shadow-md hover:shadow-lg shadow-red-500/30">
                                            <span className="text-lg flex"><MdSend /></span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    className="p-3 text-md-on-surface-variant/70 hover:text-md-primary hover:bg-md-primary/10 transition-all rounded-full active:scale-95 shrink-0"
                                >
                                    <span className="text-2xl flex"><MdMic /></span>
                                </button>
                            )
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;