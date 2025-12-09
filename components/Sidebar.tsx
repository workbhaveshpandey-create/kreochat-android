import React, { useState } from 'react';
import { UserProfile, ChatMetadata, CallLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FaSearch, FaPen, FaTrash, FaMoon, FaSun, FaUserPlus, FaUser, FaPhone, FaVideo, FaPhoneSlash, FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import ProfileDrawer from './ProfileDrawer';
import NewChatModal from './NewChatModal';
import { useToast } from '../context/ToastContext';

interface SidebarProps {
    chats: ChatMetadata[];
    currentUserProfile: UserProfile | null;
    onSelectUser: (user: UserProfile) => void;
    onSelectChat: (chatId: string) => void;
    activeChatId: string | null;
    onDeleteChat?: (chatId: string) => void;
    onCreateChat?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    chats,
    currentUserProfile,
    onSelectUser,
    onSelectChat,
    activeChatId,
    onDeleteChat,
    onCreateChat
}) => {
    const { showToast } = useToast();
    // const { logout } = useAuth(); // Logout moved to ProfileDrawer or assumed managed elsewhere
    const { theme, toggleTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [showProfileDrawer, setShowProfileDrawer] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');

    // Close context menu on click outside
    React.useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Local Search Filter
    const filteredChats = chats.filter(chat =>
        chat.participantDetails?.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteChat = async (chatId: string) => {
        if (!currentUserProfile || !confirm("Are you sure you want to delete this chat? This will remove it and clear all messages.")) return;

        try {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                archivedIds: arrayUnion(currentUserProfile.uid)
            });
            showToast("Chat deleted", 'success');
            if (onDeleteChat) onDeleteChat(chatId);
        } catch (err) {
            console.error(err);
            showToast("Failed to delete chat", 'error');
        }
    };

    return (
        <div className="w-full md:w-[380px] flex flex-col h-full bg-transparent">

            {/* Header */}
            <div className="h-[80px] px-6 flex items-center justify-between shrink-0 mb-4 pt-4">
                <div onClick={() => setShowProfileDrawer(true)} className="flex items-center gap-3.5 cursor-pointer group">
                    <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-md-primary to-emerald-400 group-hover:from-emerald-400 group-hover:to-md-primary transition-all duration-500">
                        <div className="w-full h-full rounded-full border-2 border-md-surface dark:border-[#0b141a] overflow-hidden bg-md-surface-variant">
                            {currentUserProfile?.photoURL ? (
                                <img src={currentUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-md-on-surface-variant dark:text-[#8696a0]"><FaUser /></div>
                            )}
                        </div>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-md-primary to-emerald-400 drop-shadow-sm">
                        KreoChat
                    </h1>
                </div>

                <div className="flex gap-2">
                    <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-md-surface-variant dark:hover:bg-[#202c33] text-md-on-surface-variant dark:text-[#aebac1] transition-colors">
                        {theme === 'dark' ? <FaSun /> : <FaMoon />}
                    </button>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="p-2.5 rounded-full hover:bg-md-surface-variant dark:hover:bg-[#202c33] text-md-primary dark:text-[#00a884] transition-colors"
                        title="Find People"
                    >
                        <FaUserPlus />
                    </button>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="px-6 mb-2">
                <div className="flex bg-md-surface-variant/20 dark:bg-[#202c33]/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'chats' ? 'bg-md-surface-variant dark:bg-[#202c33] text-md-on-surface dark:text-[#e9edef] shadow-sm' : 'text-md-on-surface-variant dark:text-[#8696a0] hover:text-md-on-surface dark:hover:text-[#e9edef]'}`}
                    >
                        Chats
                    </button>
                    <button
                        onClick={() => setActiveTab('calls')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calls' ? 'bg-md-surface-variant dark:bg-[#202c33] text-md-on-surface dark:text-[#e9edef] shadow-sm' : 'text-md-on-surface-variant dark:text-[#8696a0] hover:text-md-on-surface dark:hover:text-[#e9edef]'}`}
                    >
                        Calls
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-6 mb-4">
                <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant/40 dark:text-[#8696a0] group-focus-within:text-md-primary transition-colors">
                        <FaSearch />
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full bg-white dark:bg-[#202c33] text-md-on-surface dark:text-[#e9edef] placeholder-md-on-surface-variant/40 dark:placeholder-[#8696a0] rounded-[20px] py-3.5 pl-11 pr-4 outline-none border border-transparent focus:border-md-primary/20 shadow-inner dark:shadow-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-4 pb-20 md:pb-0 space-y-1">

                {activeTab === 'chats' ? (
                    // CHATS LIST
                    filteredChats.map(chat => {
                        const isSelected = activeChatId === chat.id;
                        const otherUser = chat.participantDetails;
                        const lastMsg = chat.lastMessage;
                        const time = lastMsg?.timestamp ? format(lastMsg.timestamp.toDate(), 'HH:mm') : '';

                        // Offline/Online Logic (same as before)
                        const isOnline = otherUser?.lastSeen && (new Date().getTime() - otherUser.lastSeen.toMillis() < 5 * 60 * 1000);

                        return (
                            <div
                                key={chat.id}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id });
                                }}
                                onClick={() => onSelectChat(chat.id)}
                                className={`group flex items-center gap-3 md:gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${isSelected
                                    ? 'bg-md-secondary-container dark:bg-[#2a3942]'
                                    : 'hover:bg-md-surface-variant/30 dark:hover:bg-[#202c33]'
                                    }`}
                            >
                                {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-md-primary rounded-r-full" />}

                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-md-outline/10 overflow-hidden bg-md-surface-variant dark:bg-[#202c33]">
                                        {otherUser?.photoURL ? (
                                            <img src={otherUser.photoURL} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                                                {otherUser?.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    {/* Status Indicator */}
                                    {isOnline ? (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-md-surface dark:border-[#111b21] rounded-full z-10" />
                                    ) : (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-md-surface dark:border-[#111b21] rounded-full z-10" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className={`font-bold text-[15px] truncate ${isSelected ? 'text-md-on-secondary-container dark:text-[#e9edef]' : 'text-md-on-surface dark:text-[#e9edef]'}`}>
                                            {otherUser?.username || 'Unknown User'}
                                        </h3>
                                        <span className={`text-[11px] font-medium shrink-0 ${isSelected ? 'text-md-on-secondary-container/70' : 'text-green-600 dark:text-green-400'}`}>
                                            {time}
                                        </span>
                                    </div>
                                    <p className={`text-[13px] truncate leading-relaxed ${isSelected ? 'text-md-on-secondary-container/80' : 'text-md-on-surface-variant dark:text-[#8696a0]'}`}>
                                        {lastMsg?.isDeleted
                                            ? <span className="italic opacity-70">This message was deleted</span>
                                            : (lastMsg?.senderId === currentUserProfile?.uid ? `You: ${lastMsg?.text}` : lastMsg?.text)
                                        }
                                    </p>
                                </div>
                                {chat.lastMessage?.unreadCount && chat.lastMessage.unreadCount > 0 ? (
                                    <span className="bg-gradient-to-r from-md-primary to-emerald-500 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
                                        {chat.lastMessage.unreadCount}
                                    </span>
                                ) : null}
                            </div>
                        );
                    })
                ) : (
                    // CALLS LIST (Mock based on real users)
                    <div className="space-y-2 mt-2">
                        <p className="text-center text-xs font-medium text-md-on-surface-variant/50 dark:text-[#8696a0] py-4 uppercase tracking-wider">Recent</p>

                        {chats.slice(0, 5).map((chat, i) => {
                            const otherUser = chat.participantDetails;
                            // Mock call details based on index
                            const isMissed = i === 0;
                            const isOutgoing = i === 1;
                            const callTime = "Today, " + (10 + i) + ":30 AM";

                            return (
                                <div key={chat.id} className="flex items-center gap-3 md:gap-4 p-3 rounded-2xl hover:bg-md-surface-variant/30 dark:hover:bg-[#202c33] cursor-pointer transition-colors group">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-md-outline/10 overflow-hidden bg-md-surface-variant dark:bg-[#202c33]">
                                            {otherUser?.photoURL ? (
                                                <img src={otherUser.photoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                                                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-[15px] truncate text-md-on-surface dark:text-[#e9edef]">
                                            {otherUser?.username || 'Unknown User'}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs text-md-on-surface-variant/70 dark:text-[#8696a0]">
                                            {isMissed ? (
                                                <span className="text-red-500 rotate-[135deg]"><FaArrowDown /></span>
                                            ) : isOutgoing ? (
                                                <span className="text-green-500 rotate-45"><FaArrowUp /></span>
                                            ) : (
                                                <span className="text-red-500 rotate-45"><FaArrowDown /></span>
                                            )}
                                            <span>{callTime}</span>
                                        </div>
                                    </div>
                                    <button className="p-2.5 rounded-full bg-md-surface-variant/20 dark:bg-[#202c33] text-md-primary dark:text-[#00a884] hover:bg-md-primary hover:text-white dark:hover:bg-[#00a884] dark:hover:text-white transition-colors">
                                        <span className="text-sm"><FaPhone /></span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-md-surface/90 dark:bg-md-dark-surface/90 backdrop-blur-md rounded-xl shadow-2xl border border-md-outline/10 dark:border-white/5 overflow-hidden min-w-[160px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        onClick={() => handleDeleteChat(contextMenu.chatId)}
                        className="w-full text-left px-4 py-3 text-sm text-md-error hover:bg-md-error/10 flex items-center gap-2 transition-colors"
                    >
                        <FaTrash /> Delete Chat
                    </button>
                </div>
            )}

            <ProfileDrawer
                isOpen={showProfileDrawer}
                onClose={() => setShowProfileDrawer(false)}
                userProfile={currentUserProfile}
            />

            <NewChatModal
                isOpen={showNewChat}
                onClose={() => setShowNewChat(false)}
                onSelectUser={onSelectUser}
                currentUserProfile={currentUserProfile}
            />
        </div>
    );
};

export default Sidebar;