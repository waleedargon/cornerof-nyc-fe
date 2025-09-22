'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { 
  ArrowLeft, 
  Loader2,
  Search 
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { findPotentialMatches } from '@/lib/actions';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { SwipeableMatchCard } from '@/components/swipeable-match-card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Group, User as UserType } from '@/lib/types';

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user's group
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchUserGroup = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const groupsQuery = query(
          collection(db, 'groups'), 
          where('members', 'array-contains', userRef)
        );
        const groupSnapshot = await getDocs(groupsQuery);

        if (groupSnapshot.empty) {
          toast({
            title: 'No Group Found',
            description: 'You need to create or join a group first.',
            variant: 'destructive',
          });
          router.push('/home');
          return;
        }

        const groupData = {
          id: groupSnapshot.docs[0].id,
          ...groupSnapshot.docs[0].data()
        } as Group;

        setUserGroup(groupData);
        
        // Check if group is open to matching before fetching matches
        if (groupData.isOpenToMatch) {
          await fetchPotentialMatches(groupData);
        } else {
          console.log('Group is not open to matching');
          setPotentialMatches([]);
        }
      } catch (error) {
        console.error('Error fetching user group:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your group.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroup();
  }, [user, authLoading, router, toast]);

  const fetchPotentialMatches = async (currentGroup: Group) => {
    try {
      // Check if current group is open to matching
      if (!currentGroup.isOpenToMatch) {
        console.log('Current group is not open to matching');
        setPotentialMatches([]);
        return;
      }

      // Check if current group already has an active match
      if (currentGroup.hasActiveMatch) {
        console.log('Current group already has an active match');
        setPotentialMatches([]);
        return;
      }

      // Use the new AI-powered matching function
      const matches = await findPotentialMatches(currentGroup.id);
      console.log('AI-powered matches found:', matches.length);
      
      setPotentialMatches(matches);
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load potential matches.',
        variant: 'destructive',
      });
    }
  };

  const handlePass = useCallback(async (groupId: string) => {
    if (!userGroup) return;

    try {
      console.log('Passing on group:', groupId);
      
      // Record the pass decision
      await setDoc(doc(db, 'groups', userGroup.id, 'swipes', groupId), {
        decision: 'no',
        swipedAt: serverTimestamp()
      });

      // Remove from potential matches
      setPotentialMatches(prev => prev.filter(group => group.id !== groupId));
      
      toast({
        title: 'Passed',
        description: 'Group removed from your matches.',
      });
    } catch (error) {
      console.error('Error passing on group:', error);
      toast({
        title: 'Error',
        description: 'Failed to pass on group. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userGroup, toast]);

  const handleInvite = useCallback(async (targetGroup: Group) => {
    if (!userGroup) return;

    try {
      console.log('Sending invitation to group:', targetGroup.id);
      
      // Record the like decision
      await setDoc(doc(db, 'groups', userGroup.id, 'swipes', targetGroup.id), {
        decision: 'yes',
        swipedAt: serverTimestamp()
      });

      // Create invitation
      const userGroupRef = doc(db, 'groups', userGroup.id);
      const targetGroupRef = doc(db, 'groups', targetGroup.id);
      
      await addDoc(collection(db, 'invitations'), {
        fromGroup: userGroupRef,
        toGroup: targetGroupRef,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Remove from potential matches
      setPotentialMatches(prev => prev.filter(group => group.id !== targetGroup.id));
      
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${targetGroup.name}!`,
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    }
  }, [userGroup, toast]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header centerLogo={true} showSignOut={!!user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading matches...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/signin');
    return null;
  }

  if (!userGroup) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header centerLogo={true} showSignOut={!!user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">No Group Found</h2>
            <p className="text-muted-foreground">You need to create or join a group first.</p>
            <Button onClick={() => router.push('/home')}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header centerLogo={true} showSignOut={!!user} />
      
      <div className="flex-1 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/home')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Group Status Info */}
        {userGroup && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{userGroup.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {userGroup.hasActiveMatch 
                    ? 'Currently in a Match' 
                    : userGroup.isOpenToMatch 
                    ? 'Open to Match' 
                    : 'Closed for the Night'}
                </p>
              </div>
              {userGroup.hasActiveMatch ? (
                <div className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                  Active Match
                </div>
              ) : !userGroup.isOpenToMatch && (
                <div className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  Visibility Off
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matches Content */}
        {userGroup.hasActiveMatch ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">💬</div>
              <h2 className="text-2xl font-bold">You Have an Active Match!</h2>
              <p className="text-muted-foreground max-w-md">
                Your group is currently in a match. You can't find new matches until your current match ends.
              </p>
              <Button onClick={() => router.push('/home')}>
                Go to Chat
              </Button>
            </div>
          </div>
        ) : !userGroup.isOpenToMatch ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">🔒</div>
              <h2 className="text-2xl font-bold">Group Not Open to Match</h2>
              <p className="text-muted-foreground max-w-md">
                Your group visibility is set to "Closed for the Night". 
                Turn on visibility from your home page to start seeing matches.
              </p>
              <Button onClick={() => router.push('/home')}>
                Go to Home
              </Button>
            </div>
          </div>
        ) : potentialMatches.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎯</div>
              <h2 className="text-2xl font-bold">No Matches Found</h2>
              <p className="text-muted-foreground max-w-md">
                We couldn't find any compatible groups right now. 
                Try adjusting your group details or check back later!
              </p>
              <Button onClick={() => router.push('/home')}>
                Back to Home
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {potentialMatches.length} potential match{potentialMatches.length !== 1 ? 'es' : ''} found
            </div>
            
            <div className="space-y-4">
              {potentialMatches.map((group) => (
                <SwipeableMatchCard
                  key={group.id}
                  match={group}
                  onPass={() => handlePass(group.id)}
                  onInvite={() => handleInvite(group)}
                />
              ))}
            </div>
            
            {/* AI Match Info */}
            <div className="text-xs text-center text-muted-foreground mt-8 space-y-1">
              <p>🤖 Matches powered by AI</p>
              <p><span className="text-red-500">Swipe left to pass</span> • <span className="text-green-500">Swipe right to invite</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
