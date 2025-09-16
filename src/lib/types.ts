
import type { DocumentReference, Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  avatarUrl?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  phone?: string;
};

export type GroupIntent = 'all-boys' | 'all-girls' | 'mixed' | 'any';
export type GroupMode = 'dictator' | 'democracy';

export type Group = {
  id: string;
  name: string;
  size: number;
  neighborhood: string;
  vibe: string;
  intent: GroupIntent;
  mode: GroupMode;
  pictureUrl?: string;
  isOpenToMatch?: boolean;
  hasActiveMatch?: boolean; // Track if group already has an active match
  creator: DocumentReference<User> | User; // Can be a reference or a populated user object
  members: (DocumentReference<User> | User)[]; // Can be a reference or a populated user object
  createdAt?: Timestamp | string; // Allow string for serialized objects
  inviteCode?: string;
  status?: 'pending' | 'liked-by-us' | 'liked-by-them'; // For potential matches on homepage
  // AI matching fields
  compatibilityScore?: number;
  matchReasoning?: string;
};

export type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  description?: string;
  url?: string;
};

export type Match = {
    id: string;
    groups: DocumentReference<Group>[];
    createdAt: Timestamp;
    venueSuggestion?: string;
    venueReasoning?: string;
    venueUrl?: string;
    venueDescription?: string;
}

export type Message = {
  id: string;
  text: React.ReactNode;
  sender: 'user' | 'other' | 'system';
  timestamp: string;
  user: User;
  group?: Group;
};

export type Like = {
    likedAt: Timestamp;
};

export type Invitation = {
  id: string;
  fromGroup: DocumentReference<Group>;
  toGroup: DocumentReference<Group>;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
  // Democracy mode fields
  votes?: Vote[];
  totalVotes?: number;
  acceptVotes?: number;
  rejectVotes?: number;
  voteComplete?: boolean;
};

export type Vote = {
  id: string;
  userId: string;
  userName: string;
  invitationId: string;
  decision: 'accept' | 'reject';
  votedAt: Timestamp;
};

export type Report = {
  id: string;
  messageId: string;
  matchId: string;
  reportedBy: DocumentReference<User> | User;
  reportedUser: DocumentReference<User> | User;
  reporterGroup: DocumentReference<Group> | Group;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'other';
  description?: string;
  createdAt: Timestamp | Date; // Allow both for flexibility
  status: 'pending' | 'reviewed' | 'resolved';
};
    
