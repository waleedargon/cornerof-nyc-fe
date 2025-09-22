'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  Users, 
  MapPin, 
  Target, 
  Clock,
  Check,
  X,
  Vote
} from 'lucide-react';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { castVote } from '@/lib/actions';
import type { Group, User as UserType, Invitation, Vote as VoteType } from '@/lib/types';

interface DemocracyInvitationsProps {
  userGroup: Group;
  currentUser: UserType;
  onInvitationUpdate: () => void;
}

interface InvitationWithData extends Invitation {
  fromGroupData: Group;
  userVote?: VoteType;
  votes: VoteType[];
}

export function DemocracyInvitations({ userGroup, currentUser, onInvitationUpdate }: DemocracyInvitationsProps) {
  const [invitations, setInvitations] = useState<InvitationWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const { toast } = useToast();

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
    if (!userGroup) return;

    const userGroupRef = doc(db, 'groups', userGroup.id);
    
    // Set up real-time listener for invitations
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('toGroup', '==', userGroupRef),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(invitationsQuery, async (snapshot) => {
      try {
        const invitationsWithData: InvitationWithData[] = [];

        for (const invitationDoc of snapshot.docs) {
          const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as Invitation;
          
          // Get from group data
          const fromGroupSnap = await getDoc(invitation.fromGroup);
          if (!fromGroupSnap.exists()) continue;
          
          const fromGroupData = { 
            id: fromGroupSnap.id, 
            ...fromGroupSnap.data() 
          } as Group;

          // Get votes for this invitation
          const votesQuery = query(
            collection(db, 'votes'),
            where('invitationId', '==', invitation.id)
          );
          const votesSnap = await getDocs(votesQuery);
          const votes = votesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as VoteType));

          // Check if current user has voted
          const userVote = votes.find(vote => vote.userId === currentUser.id);

          invitationsWithData.push({
            ...invitation,
            fromGroupData,
            userVote,
            votes
          });
        }

        setInvitations(invitationsWithData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching invitations:', error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userGroup, currentUser.id]);

  const handleVote = async (invitationId: string, decision: 'accept' | 'reject') => {
    // CRITICAL: Check if group already has an active match
    if (userGroup.hasActiveMatch && decision === 'accept') {
      toast({
        title: 'Already Matched',
        description: 'Your group already has an active match. You cannot vote to accept new invitations.',
        variant: 'destructive',
      });
      // Refresh to clear stale invitations
      onInvitationUpdate();
      return;
    }

    setVotingLoading(invitationId);
    
    try {
      const result = await castVote(invitationId, currentUser.id, currentUser.name, decision);
      
      if (result.success) {
        // Check if voting is complete and a match was created
        if (result.voteComplete && result.decision === 'accepted') {
          toast({
            title: 'Match Created! 🎉',
            description: 'Your group voted to accept the invitation and a match has been created!',
          });
          // Clear all invitations from UI since match was created
          setInvitations([]);
        } else if (result.voteComplete && result.decision === 'rejected') {
          toast({
            title: 'Invitation Rejected',
            description: 'Your group voted to reject this invitation.',
          });
          // Remove only the rejected invitation
          setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } else {
          toast({
            title: 'Vote Cast',
            description: `You voted to ${decision} this invitation.`,
          });
        }
        onInvitationUpdate();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cast vote',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to cast vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVotingLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No pending invitations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Group Invitations ({invitations.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vote on invitations to decide as a group
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => {
          const totalMembers = userGroup.members.length;
          const totalVotes = invitation.votes.length;
          const acceptVotes = invitation.votes.filter(v => v.decision === 'accept').length;
          const rejectVotes = invitation.votes.filter(v => v.decision === 'reject').length;
          const votingProgress = (totalVotes / totalMembers) * 100;
          const majorityThreshold = Math.ceil(totalMembers / 2);

          return (
            <Card key={invitation.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  {/* Group Picture */}
                  <div className="w-16 h-16 flex-shrink-0 relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                    {invitation.fromGroupData.pictureUrl ? (
                      <Image
                        src={invitation.fromGroupData.pictureUrl}
                        alt={invitation.fromGroupData.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Group Details */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold">{invitation.fromGroupData.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Wants to match with your group
                      </p>
                    </div>

                    {/* Group Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{invitation.fromGroupData.members.length}/{invitation.fromGroupData.size} people</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{invitation.fromGroupData.neighborhood}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>{formatIntent(invitation.fromGroupData.intent)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>Vibe: {invitation.fromGroupData.vibe}</span>
                      </div>
                    </div>

                    {/* Voting Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Votes: {totalVotes}/{totalMembers}</span>
                        <span className="text-muted-foreground">
                          Need {majorityThreshold} to decide
                        </span>
                      </div>
                      <Progress value={votingProgress} className="h-2" />
                      
                      {totalVotes > 0 && (
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Accept: {acceptVotes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Reject: {rejectVotes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voting Buttons */}
                    {invitation.userVote ? (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={invitation.userVote.decision === 'accept' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          You voted to {invitation.userVote.decision}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Waiting for other members...
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVote(invitation.id, 'reject')}
                          disabled={votingLoading === invitation.id}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVote(invitation.id, 'accept')}
                          disabled={votingLoading === invitation.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
