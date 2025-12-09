import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';
import { ChatMetadata, UserProfile } from '../types';
import { FaLaptop, FaLock, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import InfoPanel from './InfoPanel';


const ChatInterface: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const { showToast } = useToast();
  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<UserProfile | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  // 1. Listen for Active Chats
  // 0. Request Notification Permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 1. Listen for Active Chats
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList: ChatMetadata[] = [];
      const promises = snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data() as ChatMetadata;
        const otherUserId = data.participants.find(uid => uid !== user.uid);

        let otherUser: UserProfile | undefined;
        if (otherUserId) {
          const userRef = doc(db, 'users', otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            otherUser = userSnap.data() as UserProfile;
          }
        }

        return {
          id: chatDoc.id,
          ...data,
          participantDetails: otherUser
        };
      });

      const results = await Promise.all(promises);
      const activeChats = results.filter(chat => !chat.archivedIds?.includes(user.uid));
      setChats(activeChats);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. In-App & System Notifications for New Messages
  // Use a ref to track the previous lastMessage timestamps map to detect NEW messages
  const lastMessageTimestamps = React.useRef<Record<string, number>>({});
  const audioContextRef = React.useRef<AudioContext | null>(null);

  useEffect(() => {
    if (chats.length === 0) return;

    chats.forEach(chat => {
      const lastMsg = chat.lastMessage;
      if (!lastMsg || !lastMsg.timestamp) return;

      const currentTimestamp = lastMsg.timestamp.toMillis();
      const prevTimestamp = lastMessageTimestamps.current[chat.id];

      // If we have a new message (newer timestamp than stored)
      if (prevTimestamp && currentTimestamp > prevTimestamp) {

        // Notify ONLY if:
        // 1. It's not me
        // 2. I am NOT currently in this chat (or window not focused)
        const isBackground = !document.hasFocus() || document.visibilityState === 'hidden';
        const isDifferentChat = selectedChatId !== chat.id;

        if (lastMsg.senderId !== user?.uid && (isDifferentChat || isBackground)) {

          const senderName = chat.participantDetails?.username || 'User';

          // 1. Play Sound (Always try to play)
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log("Sound play failed (autopermissions?)", e));

          // 2. Show Toast (In-App)
          // Only show toast if we are in the app but looking at a different chat
          // If we are completely out of focus, the system notification is enough, but toast is harmless
          if (isDifferentChat || isBackground) {
            showToast(`New message from ${senderName}`, 'info');
          }

          // 3. System Notification (Background only)
          if (isBackground && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification(`New message from ${senderName}`, {
                body: lastMsg.text,
                icon: '/icon.png',
                tag: 'new-message', // Groups notifications
                silent: true // We proved manual sound
              });

              notif.onclick = () => {
                window.focus();
                if (handleSelectChat) handleSelectChat(chat.id); // Try to jump to chat if supported
                notif.close();
              };
            } catch (e) {
              console.error("System notification failed", e);
            }
          }
        }
      }

      // Update ref
      lastMessageTimestamps.current[chat.id] = currentTimestamp;
    });

  }, [chats, selectedChatId, user?.uid, showToast]);

  // 2. Function to start or select a chat (SECURE)
  const handleSelectUser = async (targetUser: UserProfile) => {
    if (!user || !userProfile) return;

    const existingChat = chats.find(c => c.participants.includes(targetUser.uid));

    if (existingChat) {
      setSelectedChatId(existingChat.id);
      setSelectedChatUser(targetUser);
    } else {
      // Check if a chat exists but is hidden
      const activeChatRef = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const activeSnap = await getDocs(activeChatRef);
      let foundHidden = false;

      for (const d of activeSnap.docs) {
        const data = d.data() as ChatMetadata;
        if (data.participants.includes(targetUser.uid)) {
          // Found it! Un-hide it.
          await setDoc(doc(db, 'chats', d.id), {
            archivedIds: data.archivedIds?.filter(id => id !== user.uid) || []
          }, { merge: true });

          setSelectedChatId(d.id);
          setSelectedChatUser(targetUser);
          foundHidden = true;
          break;
        }
      }

      if (!foundHidden) {
        // START NEW CHAT (Unencrypted)
        try {
          const newChatRef = doc(collection(db, 'chats'));

          const newChatData = {
            participants: [user.uid, targetUser.uid],
            updatedAt: serverTimestamp(),
            // keys: REMOVED
            lastMessage: {
              text: '✨ Chat created',
              senderId: 'system',
              timestamp: Timestamp.now(),
              unreadCount: 0
            }
          };

          await setDoc(newChatRef, newChatData);
          setSelectedChatId(newChatRef.id);
          setSelectedChatUser(targetUser);
        } catch (e) {
          console.error("Failed to create chat", e);
          showToast("Failed to create chat.", 'error');
        }
      }
    }
  };

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.participantDetails) {
      setSelectedChatId(chatId);
      setSelectedChatUser(chat.participantDetails);
    }
  };

  const handleChatDeleted = (chatId: string) => {
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setSelectedChatUser(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b141a] transition-colors duration-300 p-0 md:p-6 lg:p-8 items-center justify-center relative">
      {/* Background Gradients for depth */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className="flex w-full h-full max-w-[1600px] md:h-[95vh] gap-4 md:gap-6 bg-transparent p-0 z-10"
      >

        {/* Sidebar - Hidden on mobile if chat is selected */}
        <div className={`${selectedChatId ? 'hidden md:flex' : 'flex w-full md:w-auto'} h-full bg-md-surface/90 dark:bg-[#111b21]/90 backdrop-blur-3xl md:rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden`}>
          <Sidebar
            chats={chats}
            currentUserProfile={userProfile}
            onSelectUser={handleSelectUser}
            onSelectChat={handleSelectChat}
            activeChatId={selectedChatId || ''}
            onDeleteChat={handleChatDeleted}
            onCreateChat={() => setShowNewChatModal(true)}
          />
        </div>

        <main className={`flex-1 flex flex-col h-full bg-md-surface/90 dark:bg-[#0b141a]/90 backdrop-blur-3xl md:rounded-[2rem] shadow-2xl border border-white/5 relative transition-all duration-300 overflow-hidden ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
          {selectedChatId && selectedChatUser ? (
            <ChatWindow
              chatId={selectedChatId}
              recipient={selectedChatUser}
              onBack={() => setSelectedChatId(null)}
              onProfileClick={() => setShowMobileInfo(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-md-primary/5 rounded-full blur-[120px] pointer-events-none" />

              {/* Hero Icon Stack */}
              <div className="relative mb-12 group">
                <div className="w-28 h-28 bg-gradient-to-br from-md-surface-variant/20 to-transparent rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 backdrop-blur-md relative z-10 transition-transform duration-700 hover:scale-105 hover:rotate-3">
                  <div className="text-5xl text-md-on-surface-variant/30 drop-shadow-lg"><FaLaptop /></div>
                </div>
                {/* Floating Shield */}
                <div className="absolute -right-4 -bottom-4 w-14 h-14 bg-gradient-to-tr from-md-primary to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-md-primary/30 z-20 animate-[bounce_3s_infinite]">
                  <div className="text-2xl text-white drop-shadow-md"><FaShieldAlt /></div>
                </div>
                {/* Decor */}
                <div className="absolute -top-8 -right-8 text-emerald-500/10 text-6xl animate-pulse">✦</div>
                <div className="absolute -bottom-12 -left-12 text-blue-500/5 text-8xl rotate-12">✦</div>
              </div>

              <h2 className="text-3xl md:text-4xl font-light mb-4 tracking-tight text-md-on-surface dark:text-[#e9edef] z-10">
                Welcome to <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-md-primary to-emerald-400">KreoChat</span>
              </h2>
              <p className="text-md-on-surface-variant dark:text-[#8696a0] max-w-md text-sm md:text-base leading-relaxed mb-8 z-10">
                Send and receive messages without keeping your phone online.<br />
                Use KreoChat on up to 4 linked devices and 1 phone.
              </p>

              <div className="absolute bottom-10 flex items-center gap-2 text-[#8696a0] text-xs font-medium z-10 opacity-70">
                <span className="text-[10px]"><FaShieldAlt /></span>
                <span>End-to-end encrypted</span>
              </div>

              <p className="max-w-md text-lg leading-relaxed text-md-on-surface-variant/80 dark:text-gray-400 font-light z-10">
                Select a conversation from the sidebar to start chatting securely.
              </p>

              {/* Badge */}
              <div className="mt-16 flex items-center gap-3 px-5 py-2.5 rounded-full bg-md-surface-variant/20 dark:bg-white/5 border border-white/5 text-sm font-medium text-md-on-surface-variant/60 backdrop-blur-md transition-colors hover:bg-md-surface-variant/30 hover:border-md-primary/20 z-10">
                <div className="text-md-primary/80"><FaLock /></div>
                <span>Your personal messages are end-to-end encrypted</span>
              </div>
            </div>
          )}
        </main>

        <div className="hidden xl:block h-full bg-md-surface/90 dark:bg-[#111b21]/90 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
          <InfoPanel activeUser={selectedChatUser} activeChatId={selectedChatId} />
        </div>
      </motion.div>

      {/* Mobile Info Panel Drawer */}
      {showMobileInfo && selectedChatUser && (
        <div className="fixed inset-0 z-50 xl:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMobileInfo(false)}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 bottom-0 w-[320px] bg-[#111b21] shadow-2xl border-l border-white/5"
          >
            <InfoPanel
              activeUser={selectedChatUser}
              activeChatId={selectedChatId}
              onClose={() => setShowMobileInfo(false)}
            />
          </motion.div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={(user) => {
          handleSelectUser(user);
          setShowNewChatModal(false);
        }}
        currentUserProfile={userProfile}
      />
    </div>
  );
};

export default ChatInterface;