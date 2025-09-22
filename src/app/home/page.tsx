
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  DocumentReference,
  updateDoc,
} from 'firebase/firestore';
import Image from 'next/image';
import {
  User,
  Users,
  Search,
  MapPin,
  Smile,
  Target,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Heart,
  MessageSquare,
  Edit,
  Eye,
  EyeOff,
  Crown,
  Mail,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AddGroupDialog } from '@/components/add-group-dialog';
import { EditGroupDialog } from '@/components/edit-group-dialog';
import { GroupMembersDialog } from '@/components/group-members-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Group, Match, User as UserType } from '@/lib/types';
import { DemocracyInvitations } from '@/components/democracy-invitations';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteDialog } from '@/components/invite-dialog';
import { findPotentialMatch, handleMatchDecision } from '@/lib/actions';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [potentialMatch, setPotentialMatch] = useState<Group | null>(null);
  const [matchInfo, setMatchInfo] = useState<{ id: string; otherGroup: Group } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [receivedInvitationsCount, setReceivedInvitationsCount] = useState(0);

  const getNextMatch = useCallback(async (currentGroupId: string) => {
    if (!currentGroupId) return;
    setIsFindingMatch(true);
    setPotentialMatch(null);
    try {
      const nextMatch = await findPotentialMatch(currentGroupId);
      setPotentialMatch(nextMatch);
    } catch (error) {
      console.error('Error finding potential match:', error);
    } finally {
      setIsFindingMatch(false);
    }
  }, []);

  const handleVisibilityToggle = async (isOpen: boolean) => {
    if (!userGroup) return;

    try {
      const groupRef = doc(db, 'groups', userGroup.id);
      await updateDoc(groupRef, {
        isOpenToMatch: isOpen
      });

      toast({
        title: isOpen ? 'Group is now open to matching!' : 'Group is now closed for matching',
        description: isOpen
          ? 'Your group will appear in other groups\' matches.'
          : 'Your group will not appear in matches until you open it again.',
      });
    } catch (error) {
      console.error('Error updating group visibility:', error);
      toast({
        title: 'Error',
        description: 'Could not update group visibility.',
        variant: 'destructive',
      });
    }
  };

  const formatIntent = (intent: string) => {
    switch (intent) {
      case 'all-boys': return 'All Guys';
      case 'all-girls': return 'All Girls';
      case 'mixed': return 'Mixed (Guys & Girls)';
      case 'any': return 'Any (Open to All)';
      default: return intent;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setUserGroup(null);
      setMatchInfo(null);
      setPotentialMatch(null);
      return;
    }

    setLoading(true);

    const userRef = doc(db, 'users', user.id);
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', userRef));

    const unsubscribeGroups = onSnapshot(groupsQuery, async (groupSnap) => {
      if (groupSnap.empty) {
        setUserGroup(null);
        setMatchInfo(null);
        setPotentialMatch(null);
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
              setPotentialMatch(null); // Clear potential match if a real match is found
            }
          }
          setLoading(false);
        } else {
          setMatchInfo(null); // Clear old match info
          // Only fetch next match if we aren't already showing one
          if (!potentialMatch) {
            await getNextMatch(groupData.id);
          }
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

  const onDecision = async (decision: 'yes' | 'no') => {
    if (!userGroup || !potentialMatch || decisionLoading) return;
    setDecisionLoading(true);

    const result = await handleMatchDecision(userGroup.id, potentialMatch.id, decision);

    if (result.status === 'rejected') {
      await getNextMatch(userGroup.id);
    } else if (result.status === 'liked') {
      // The user liked the other group. Update the UI to show the waiting state.
      // A real-time listener will handle the 'match_created' case automatically.
      setPotentialMatch(prev => prev ? { ...prev, status: 'liked-by-us' } : null);
    }
    // If status is 'match_created', the onSnapshot listener will handle the UI update automatically.

    setDecisionLoading(false);
  };

  if (loading || authLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header centerLogo={true} showSignOut={!!user} />
      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* My Group */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Group</CardTitle>
                {!userGroup && <CardDescription>Create a group to find a match!</CardDescription>}
              </div>
              {userGroup && user && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <InviteDialog group={userGroup} />
                  {/* Edit Group - Admin Only */}
                  {(userGroup.creator as UserType)?.id === user?.id && (
                    <EditGroupDialog
                      group={userGroup}
                      onGroupUpdated={() => window.location.reload()}
                    />
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {userGroup ? (
              <div className="space-y-6">
                {/* Group Header with Picture */}
                <div className="flex flex-col space-y-4">
                  {/* Mobile: Centered layout, Desktop: Side by side */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Group Picture */}
                    <div className="w-20 h-20 flex-shrink-0 relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                      {userGroup.pictureUrl ? (
                        <Image
                          src={userGroup.pictureUrl}
                          alt={userGroup.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Group Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl font-bold font-headline">{userGroup.name}</h3>
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-1">
                        <span>Created by {(userGroup.creator as UserType)?.name || 'Loading...'}</span>
                        {(userGroup.creator as UserType)?.id === user?.id && (
                          <Crown className="h-4 w-4 text-yellow-500" title="Group Admin" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visibility Toggle - Full width on mobile */}
                  <div className="flex items-center justify-center sm:justify-start">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                      {userGroup.isOpenToMatch ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        {userGroup.isOpenToMatch ? 'Open to Match' : 'Closed for the Night'}
                      </span>
                      <Checkbox
                        checked={userGroup.isOpenToMatch || false}
                        onCheckedChange={handleVisibilityToggle}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div className="flex items-center justify-start gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {userGroup.members.length} / {userGroup.size} people
                    </span>
                  </div>
                  <div className="flex items-center justify-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{userGroup.neighborhood}</span>
                  </div>
                  <div className="flex items-center justify-start gap-2">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                    <span>{userGroup.vibe}</span>
                  </div>
                  <div className="flex items-center justify-start gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span>{formatIntent(userGroup.intent)}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Members</h4>
                    <GroupMembersDialog
                      group={userGroup}
                      currentUser={user!}
                      onGroupUpdated={() => window.location.reload()}
                    />
                  </div>
                  <div className="flex items-center justify-start -space-x-2">
                    {userGroup.members && userGroup.members.length > 0 ? (
                      userGroup.members.map((member) =>
                        (member as UserType).avatarUrl ? (
                          <Image
                            key={(member as UserType).id}
                            alt={(member as UserType).name}
                            className="aspect-square rounded-full object-cover border-2 border-background"
                            height="40"
                            src={(member as UserType).avatarUrl!}
                            width="40"
                            data-ai-hint="user avatar"
                            title={(member as UserType).name}
                          />
                        ) : (
                          <div
                            key={(member as UserType).id}
                            title={(member as UserType).name}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-muted border-2 border-background text-muted-foreground"
                          >
                            <User className="h-5 w-5" />
                          </div>
                        )
                      )
                    ) : (
                      <div className="flex items-center text-muted-foreground text-sm">
                        <User className="h-4 w-4 mr-1" />
                        <span>No members yet</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Find Matches Button */}
                  {userGroup.isOpenToMatch ? (
                    <Button asChild variant="default" className="flex-1 sm:flex-none">
                      <Link href="/matches">
                        <Search className="h-4 w-4 mr-2" />
                        Find Matches
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="flex-1 sm:flex-none">
                      <Search className="h-4 w-4 mr-2" />
                      Find Matches (Group Closed)
                    </Button>
                  )}

                  {/* Invitations - Admin Only (Shot Caller Mode) */}
                  {(userGroup.creator as UserType)?.id === user?.id && userGroup.mode === 'dictator' && (
                    <Button asChild variant="outline" className="relative">
                      <Link href="/invitations">
                        <Mail className="h-4 w-4" />
                        {receivedInvitationsCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                            {receivedInvitationsCount > 9 ? '9+' : receivedInvitationsCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                  )}

                  {/* Reports - Admin Only */}
                  {(userGroup.creator as UserType)?.id === user?.id && (
                    <Button asChild variant="outline">
                      <Link href="/reports">
                        <Flag className="h-4 w-4" />
                        Reports
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold mb-1 font-headline">
                  You're not in a group yet.
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a group to find a match!
                </p>
                <div className="flex gap-4">{user && <AddGroupDialog user={user} />}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Match */}
        {matchInfo && <Card>
          <CardHeader>
            <CardTitle>My Match</CardTitle>
            {matchInfo && (
              <CardDescription>You've matched! Start the conversation.</CardDescription>
            )}
            {!matchInfo && !potentialMatch && (
              <CardDescription>Find a group to connect with.</CardDescription>
            )}
            {potentialMatch && (
              <CardDescription>Here is a potential match for your group.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {matchInfo && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold font-headline">
                      {matchInfo.otherGroup.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      A group of {matchInfo.otherGroup.size} in{' '}
                      {matchInfo.otherGroup.neighborhood}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/chat/${matchInfo.id}`}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Link>
                  </Button>
                </div>
              </div>
            )
              // : isFindingMatch ? (
              //   <div className="flex flex-col items-center justify-center text-center p-8">
              //     <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-3" />
              //     <h3 className="text-lg font-semibold mb-1 font-headline">
              //       Searching for a match...
              //     </h3>
              //   </div>
              // ) 
              // : potentialMatch ? (
              //   <div className="space-y-4">
              //     <div>
              //       <h3 className="text-lg font-semibold font-headline">
              //         {potentialMatch.name}
              //       </h3>
              //       <p className="text-sm text-muted-foreground">
              //         A group of {potentialMatch.size} from {potentialMatch.neighborhood}
              //       </p>
              //     </div>
              //     <div className="text-sm">
              //       <p>
              //         <span className="font-semibold">Vibe:</span> {potentialMatch.vibe}
              //       </p>
              //       <p>
              //         <span className="font-semibold">Intent:</span> "{potentialMatch.intent}"
              //       </p>
              //     </div>

              //     {potentialMatch.status === 'liked-by-us' ? (
              //       <div className="p-4 text-center bg-muted rounded-md text-muted-foreground">
              //         <Heart className="h-5 w-5 mx-auto mb-2 text-primary" />
              //         <p className="font-semibold">You accepted!</p>
              //         <p className="text-sm">Waiting for them to respond...</p>
              //       </div>
              //     ) : (
              //       <>
              //         {potentialMatch.status === 'liked-by-them' && (
              //           <div className="p-2 text-center bg-accent rounded-md text-accent-foreground">
              //             <p className="font-semibold text-sm">They accepted! What do you think?</p>
              //           </div>
              //         )}
              //         <div className="grid grid-cols-2 gap-4 pt-2">
              //           <Button
              //             variant="outline"
              //             onClick={() => onDecision('no')}
              //             disabled={decisionLoading}
              //           >
              //             {decisionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />}
              //             Reject
              //           </Button>
              //           <Button onClick={() => onDecision('yes')} disabled={decisionLoading}>
              //             {decisionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
              //             Accept
              //           </Button>
              //         </div>
              //       </>
              //     )}
              //   </div>
              // ) : (
              //   <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed">
              //     <Search className="h-10 w-10 text-muted-foreground mb-3" />
              //     <h3 className="text-lg font-semibold mb-1 font-headline">
              //       No new groups right now.
              //     </h3>
              //     <p className="text-sm text-muted-foreground mb-4">
              //       {userGroup
              //         ? 'Check back later or click to try again.'
              //         : 'Create a group to start finding matches.'}
              //     </p>
              //     <Button
              //       onClick={() => userGroup && getNextMatch(userGroup.id)}
              //       disabled={!userGroup || isFindingMatch}
              //     >
              //       {isFindingMatch ? (
              //         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              //       ) : null}
              //       Find New Match
              //     </Button>
              //   </div>
              // )
            }
          </CardContent>
        </Card>
        }

        {/* Majority Rules Mode Invitations */}
        {userGroup && userGroup.mode === 'democracy' && user && (
          <DemocracyInvitations
            userGroup={userGroup}
            currentUser={user}
            onInvitationUpdate={() => window.location.reload()}
          />
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header centerLogo={true} showSignOut={true} />
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Group</CardTitle>
            <div className="text-sm text-muted-foreground pt-1.5">
              <Skeleton className="h-4 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <div>
                <Skeleton className="h-4 w-1/4 mb-2" />
                <div className="flex items-center -space-x-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* 
        <Card>
          <CardHeader>
            <CardTitle>My Match</CardTitle>
            <div className="text-sm text-muted-foreground pt-1.5">
              <Skeleton className="h-4 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed">
              <Search className="h-10 w-10 text-muted-foreground mb-3" />
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64 mb-4" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
