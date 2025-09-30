'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Heart, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, doc, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Match } from '@/lib/types';

const navigationItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
    type: 'link',
  },
  {
    name: 'Matches',
    href: '/matches',
    icon: Heart,
    type: 'link',
  },
  {
    name: 'Chat',
    href: '/chat',
    icon: MessageCircle,
    type: 'chat',
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    type: 'link',
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Don't show bottom navigation on admin pages, auth pages, onboarding, or public pages
  const hideOnPaths = [
    '/', // Root/landing page
    '/admin',
    '/admin-signin',
    '/signin',
    '/signup',
    '/verify-otp',
    '/join',
  ];

  const shouldHide = hideOnPaths.some(path => {
    if (path === '/') {
      return pathname === '/'; // Exact match for root
    }
    return pathname.startsWith(path);
  });


  if (shouldHide) {
    return null;
  }

  // Real-time listener for user's active match/chatroom
  useEffect(() => {
    if (!user) {
      setActiveChatId(null);
      return;
    }

    const userRef = doc(db, 'users', user.id);
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', userRef));

    const unsubscribeGroups = onSnapshot(groupsQuery, async (groupSnap) => {
      if (groupSnap.empty) {
        setActiveChatId(null);
        return;
      }

      const groupDoc = groupSnap.docs[0];
      const groupRef = doc(db, 'groups', groupDoc.id);
      const matchesQuery = query(collection(db, 'matches'), where('groups', 'array-contains', groupRef));

      const unsubscribeMatches = onSnapshot(matchesQuery, (matchSnap) => {
        if (!matchSnap.empty) {
          const matchDoc = matchSnap.docs[0];
          setActiveChatId(matchDoc.id);
        } else {
          setActiveChatId(null);
        }
      }, (error) => {
        console.error("Error fetching matches:", error);
        setActiveChatId(null);
      });

      return () => unsubscribeMatches();
    }, (error) => {
      console.error("Error fetching user group:", error);
      setActiveChatId(null);
    });

    return () => unsubscribeGroups();
  }, [user]);

  const handleChatClick = () => {
    if (activeChatId) {
      router.push(`/chat/${activeChatId}`);
    }
    // If no active chat, do nothing (item will be disabled)
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href === '/chat' && pathname.startsWith('/chat/')) ||
                          (item.href === '/profile' && pathname.startsWith('/profile'));
          
          // Special handling for chat item
          if (item.type === 'chat') {
            const isDisabled = !activeChatId;
            
            return (
              <button
                key={item.name}
                onClick={handleChatClick}
                disabled={isDisabled}
                className={cn(
                  'flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1 text-xs font-medium transition-colors',
                  isDisabled
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon 
                  className={cn(
                    'h-5 w-5 mb-1',
                    isDisabled
                      ? 'text-muted-foreground/50'
                      : isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  )} 
                />
                <span className={cn(
                  'text-[10px] leading-none',
                  isDisabled
                    ? 'text-muted-foreground/50'
                    : isActive 
                    ? 'text-primary font-semibold' 
                    : 'text-muted-foreground'
                )}>
                  {item.name}
                </span>
              </button>
            );
          }
          
          // Regular link items
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon 
                className={cn(
                  'h-5 w-5 mb-1',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} 
              />
              <span className={cn(
                'text-[10px] leading-none',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
