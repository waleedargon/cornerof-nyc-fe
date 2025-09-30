
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  DocumentReference,
} from 'firebase/firestore';

import { Header } from '@/components/header';
import { GroupCard } from '@/components/home/group-card';
import { MatchCard } from '@/components/home/match-card';
import { LoadingSkeleton } from '@/components/home/loading-skeleton';
import { LazyLoad } from '@/components/ui/lazy-wrapper';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import type { Group, Match, User as UserType } from '@/lib/types';

// Lazy load heavy components
const DemocracyInvitations = lazy(() => 
  import('@/components/democracy-invitations').then(mod => ({ 
    default: mod.DemocracyInvitations 
  }))
);

import { lazy, Suspense } from 'react';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [matchInfo, setMatchInfo] = useState<{ id: string; otherGroup: Group } | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivedInvitationsCount, setReceivedInvitationsCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setUserGroup(null);
      setMatchInfo(null);
      return;
    }

    setLoading(true);

    const userRef = doc(db, 'users', user.id);
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', userRef));

    const unsubscribeGroups = onSnapshot(groupsQuery, async (groupSnap) => {
      if (groupSnap.empty) {
        setUserGroup(null);
        setMatchInfo(null);
        setLoading(false);
        return;
      }

      const groupDoc = groupSnap.docs[0];
      const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;

      // Hydrate group members
      if (groupData.members?.length) {
        const memberDocs = await Promise.all(
          groupData.members.map((mref) => getDoc(doc(db, (mref as DocumentReference).path)))
        );
        groupData.members = memberDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as UserType));
      }

      // Hydrate creator
      if (groupData.creator && (groupData.creator as any).path) {
        const creatorDoc = await getDoc(doc(db, (groupData.creator as any).path));
        if (creatorDoc.exists()) {
          groupData.creator = { id: creatorDoc.id, ...creatorDoc.data() } as UserType;
        }
      }

      setUserGroup(groupData);

      const groupRef = doc(db, 'groups', groupData.id);
      const matchesQuery = query(collection(db, 'matches'), where('groups', 'array-contains', groupRef));

      const unsubscribeMatches = onSnapshot(matchesQuery, async (matchSnap) => {
        if (!matchSnap.empty) {
          const matchDoc = matchSnap.docs[0];
          const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
          const otherGroupRef = (matchData.groups as DocumentReference[]).find(r => r.id !== groupData.id);

          if (otherGroupRef) {
            const otherGroupDoc = await getDoc(otherGroupRef);
            if (otherGroupDoc.exists()) {
              const otherGroup = { id: otherGroupDoc.id, ...otherGroupDoc.data() } as Group;
              setMatchInfo({ id: matchDoc.id, otherGroup });
            }
          }
          setLoading(false);
        } else {
          setMatchInfo(null);
          setLoading(false);
        }
      }, (error) => {
        console.error("Error fetching matches:", error);
        setLoading(false);
      });

      return () => unsubscribeMatches();
    }, (error) => {
      console.error("Error fetching user group:", error);
      setLoading(false);
    });

    return () => unsubscribeGroups();
  }, [user, authLoading]);

  // Listen for received invitations count
  useEffect(() => {
    if (!userGroup || !user) {
      setReceivedInvitationsCount(0);
      return;
    }

    // If group has active match, don't show invitation count
    if (userGroup.hasActiveMatch) {
      console.log('Group has active match, hiding invitation count');
      setReceivedInvitationsCount(0);
      return;
    }

    const userGroupRef = doc(db, 'groups', userGroup.id);
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('toGroup', '==', userGroupRef),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(invitationsQuery, (snapshot) => {
      // Double-check: only show count if group doesn't have active match
      if (userGroup.hasActiveMatch) {
        setReceivedInvitationsCount(0);
      } else {
        setReceivedInvitationsCount(snapshot.size);
      }
    }, (error) => {
      console.error("Error fetching invitations count:", error);
      setReceivedInvitationsCount(0);
    });

    return () => unsubscribe();
  }, [userGroup, user]);

  if (loading || authLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col">
      <Header centerLogo={true} showSignOut={!!user} />
      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* My Group */}
        <GroupCard 
          group={userGroup} 
          user={user} 
          receivedInvitationsCount={receivedInvitationsCount}
          onGroupUpdate={() => window.location.reload()}
        />

        {/* My Match */}
        <MatchCard matchInfo={matchInfo} />

        {/* Majority Rules Mode Invitations - Lazy loaded */}
        {userGroup && userGroup.mode === 'democracy' && user && (
          <LazyLoad threshold={0.1} rootMargin="100px">
            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded-lg" />}>
              <DemocracyInvitations
                userGroup={userGroup}
                currentUser={user}
                onInvitationUpdate={() => window.location.reload()}
              />
            </Suspense>
          </LazyLoad>
        )}
      </div>
    </div>
  );
}
