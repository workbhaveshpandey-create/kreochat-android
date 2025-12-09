import React from 'react';
import { FaCommentAlt, FaCircleNotch, FaUsers, FaBroadcastTower, FaCog, FaUserCircle } from 'react-icons/fa';
import { MdChat, MdDonutLarge, MdGroups, MdRssFeed, MdSettings } from 'react-icons/md';
import { UserProfile } from '../types';

interface NavigationRailProps {
    currentUserProfile: UserProfile | null;
    onLogout: () => void;
    onProfileClick: () => void;
    currentView: 'chats' | 'status' | 'settings';
    onViewChange: (view: 'chats' | 'status' | 'settings') => void;
}

const NavigationRail: React.FC<NavigationRailProps> = ({ currentUserProfile, onLogout, onProfileClick, currentView, onViewChange }) => {
    return (
        <div className="w-[64px] h-full flex flex-col items-center py-4 bg-[#202c33] border-r border-white/5 z-20">
            {/* Top Icons */}
            <div className="flex flex-col gap-6 w-full items-center">
                <button
                    onClick={() => onViewChange('chats')}
                    className={`relative group p-2 rounded-full hover:bg-white/10 transition-colors text-2xl ${currentView === 'chats' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                    title="Chats"
                >
                    <MdChat />
                    {currentView === 'chats' && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-[#00a884] rounded-r-full"></span>
                    )}
                </button>
                <button
                    onClick={() => onViewChange('status')}
                    className={`relative group p-2 rounded-full hover:bg-white/10 transition-colors text-2xl ${currentView === 'status' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                    title="Status"
                >
                    <MdDonutLarge />
                    {currentView === 'status' && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-[#00a884] rounded-r-full"></span>
                    )}
                </button>
            </div>

            {/* Bottom Icons */}
            <div className="mt-auto flex flex-col gap-6 w-full items-center">
                <button
                    // onClick={() => onViewChange('settings')} // Future: Open Settings View
                    onClick={onLogout}
                    className="p-2 text-[#8696a0] rounded-full hover:bg-white/10 transition-colors text-2xl"
                    title="Settings"
                >
                    <MdSettings />
                </button>
                <button
                    onClick={onProfileClick}
                    className="p-1 rounded-full hover:bg-white/10 transition-colors mb-2"
                    title="Profile"
                >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#6b7c85] flex items-center justify-center">
                        {currentUserProfile?.photoURL ? (
                            <img src={currentUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white text-xl"><FaUserCircle /></span>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
};

export default NavigationRail;
