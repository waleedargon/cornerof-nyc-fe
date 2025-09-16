
import type { User, Group, Venue } from './types';
import { doc } from 'firebase/firestore';
import { db } from './firebase';

// Mock data is no longer the primary source of truth but can be kept for reference or testing.

export const mockUsers: User[] = [
  { id: 'u1', name: 'Alex', avatarUrl: 'https://picsum.photos/50/50?random=1' },
  { id: 'u2', name: 'Brenda', avatarUrl: 'https://picsum.photos/50/50?random=2' },
  { id: 'u3', name: 'Charlie', avatarUrl: 'https://picsum.photos/50/50?random=3' },
  { id: 'u4', name: 'Dana', avatarUrl: 'https://picsum.photos/50/50?random=4' },
];

// Note: The `creator` and `members` fields would now be DocumentReferences in a real scenario.
// This mock data structure needs to be adjusted if used directly with new components.
export const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Board Game Geeks',
    size: 4,
    neighborhood: 'Greenwich Village',
    vibe: 'Chill and competitive',
    intent: 'Weekly board games',
    creator: doc(db, 'users', 'u1') as any,
    members: [doc(db, 'users', 'u1') as any],
  },
  {
    id: 'g2',
    name: 'Weekend Hikers',
    size: 6,
    neighborhood: 'Williamsburg',
    vibe: 'Adventurous and outdoorsy',
    intent: 'Find new trails',
    creator: doc(db, 'users', 'u2') as any,
    members: [doc(db, 'users', 'u2') as any],
  },
  {
    id: 'g3',
    name: 'Taco Tuesday Crew',
    size: 3,
    neighborhood: 'East Village',
    vibe: 'Casual and foodie',
    intent: 'Explore new taco spots',
    creator: doc(db, 'users', 'u3') as any,
    members: [doc(db, 'users', 'u3') as any],
  },
    {
    id: 'g4',
    name: 'Indie Movie Fans',
    size: 2,
    neighborhood: 'Greenwich Village',
    vibe: 'Artsy and quiet',
    intent: 'Watch and discuss films',
    creator: doc(db, 'users', 'u4') as any,
    members: [doc(db, 'users', 'u4') as any],
  }
];

export const mockVenues: Venue[] = [
  { id: 'v1', name: 'The Uncommons', neighborhood: 'Greenwich Village' },
  { id: 'v2', name: 'Otto\'s Tacos', neighborhood: 'East Village' },
  { id: 'v3', name: 'Brooklyn Brewery', neighborhood: 'Williamsburg' },
];
