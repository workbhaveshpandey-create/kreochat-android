import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaArrowLeft } from 'react-icons/fa';
import { collection, query, where, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

const CallPage: React.FC = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Zego Credentials
  const APP_ID = 396214239;
  const SERVER_SECRET = "47b6570f521064be7f943222e8b0aa27";

  const containerRef = React.useRef<HTMLDivElement>(null);
  const zpRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!containerRef.current || !roomId || !user) return;

    // Generate Kit Token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID,
      SERVER_SECRET,
      roomId,
      user.uid,
      user.displayName || "User"
    );

    // Create instance object from Kit Token.
    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;

    // Join room
    zp.joinRoom({
      container: containerRef.current,
      scenario: {
        mode: ZegoUIKitPrebuilt.OneONoneCall,
      },
      showPreJoinView: false,
      showScreenSharingButton: false,
      onLeaveRoom: async () => {
        try {
          const callsQuery = query(collection(db, 'calls'), where('roomId', '==', roomId), where('status', 'in', ['calling', 'accepted']), limit(1));
          const snapshot = await getDocs(callsQuery);
          if (!snapshot.empty) {
            await updateDoc(doc(db, 'calls', snapshot.docs[0].id), { status: 'ended' });
          }
        } catch (error) {
          console.error("Error ending call:", error);
        }
        navigate('/');
      },
    });

    return () => {
      if (zpRef.current && typeof zpRef.current.destroy === 'function') {
        zpRef.current.destroy();
      }
    };
  }, [roomId, user, navigate]);

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden ${theme === 'dark' ? 'bg-[#1a1c1e]' : 'bg-white'}`}>
      <button
        onClick={() => navigate('/')}
        className="absolute top-12 left-4 z-50 p-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all active:scale-95"
      >
        <FaArrowLeft size={20} />
      </button>
      <div
        className="w-full h-full"
        ref={containerRef}
      />
    </div>
  );
};

export default CallPage;