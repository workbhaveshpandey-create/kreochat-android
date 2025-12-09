import React from 'react';
import { FaUserCircle, FaPlus } from 'react-icons/fa';
import { UserProfile } from '../types';

interface StatusViewProps {
    currentUser: UserProfile | null;
}

const StatusView: React.FC<StatusViewProps> = ({ currentUser }) => {
    return (
        <div className="flex w-full h-full bg-[#111b21]">
            {/* Status List Sidebar */}
            <div className="w-[400px] border-r border-white/10 flex flex-col">
                <div className="h-[60px] px-4 flex items-center bg-[#202c33] shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-4 cursor-pointer">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#202c33] text-[#8696a0] text-4xl">
                                <FaUserCircle />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-[#e9edef] font-medium">My Status</h2>
                        <p className="text-[#8696a0] text-xs">Click to add status update</p>
                    </div>
                </div>

                <div className="p-4">
                    <h3 className="text-[#00a884] text-sm font-medium mb-4 uppercase">Recent updates</h3>

                    {/* Mock Status Item */}
                    <div className="flex items-center gap-4 p-2 hover:bg-[#202c33] rounded-lg cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full border-2 border-[#00a884] p-0.5">
                            <div className="w-full h-full bg-gray-500 rounded-full overflow-hidden">
                                {/* Image Placeholder */}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[#e9edef] font-medium">Alice</h4>
                            <p className="text-[#8696a0] text-xs">Today at 9:30 AM</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-2 hover:bg-[#202c33] rounded-lg cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full border-2 border-[#8696a0] p-0.5">
                            <div className="w-full h-full bg-gray-500 rounded-full overflow-hidden">
                                {/* Image Placeholder */}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[#e9edef] font-medium">Bob</h4>
                            <p className="text-[#8696a0] text-xs">Yesterday at 15:45 PM</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Viewer (Placeholder) */}
            <div className="flex-1 bg-[#0b141a] flex flex-col items-center justify-center text-[#8696a0]">
                <div className="text-6xl mb-4 opacity-30"><FaUserCircle /></div>
                <p>Click on a contact to view their status updates</p>
            </div>
        </div>
    );
};

export default StatusView;
