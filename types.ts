import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string;
  username: string;
  about: string;
  searchKeywords: string[];
  emoji: string;
  createdAt: Timestamp;
  lastSeen?: Timestamp;
}

// Extended Message Type for Media
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface MessageContent {
  type: MessageType;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
}

export interface Message {
  id?: string;
  text?: string; // Main content field now
  fileUrl?: string; // Direct file URL
  fileName?: string;
  mimeType?: string;
  senderId: string;
  timestamp: Timestamp;
  type: MessageType;
  status?: 'sent' | 'delivered' | 'read';
  // New Features
  isDeleted?: boolean; // If true, show "This message was deleted"
  deletedFor?: string[]; // Array of UIDs for "Delete for me"
  reactions?: Record<string, string[]>; // Emoji -> Array of UIDs
  replyToId?: string; // ID of the message being replied to
  editedAt?: Timestamp;
}

export interface ChatMetadata {
  id: string;
  participants: string[];
  participantDetails?: UserProfile;
  lastMessage: Message;
  updatedAt: Timestamp;
  archivedIds?: string[];
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  participants: string[];
  type: 'audio' | 'video';
  status: 'missed' | 'incoming' | 'outgoing';
  timestamp: Timestamp;
  duration?: number;
}