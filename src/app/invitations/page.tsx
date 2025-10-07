'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  Mail, 
  Clock, 
  Check, 
  X,
  Users,
  MapPin,
  Target
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { format } from 'date-fns';
import Image from 'next/image';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Group, User as UserType, Invitation } from '@/lib/types';
import { addVenueSuggestionToMatch, clearAllPendingInvitations } from '@/lib/actions';

export default function InvitationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [receivedInvitations, setReceivedInvitations] = useState<(Invitation & { fromGroupData: Group })[]>([]);
  const [sentInvitations, setSentInvitations] = useState<(Invitation & { toGroupData: Group })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get user's group and invitations
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
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

        const groupDoc = groupSnapshot.docs[0];
        const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
        setUserGroup(groupData);

        // Check if user is admin
        const isAdmin = (groupData.creator as any)?.id === user.id;
        if (!isAdmin) {
          toast({
            title: 'Access Denied',
            description: 'Only group admins can view invitations.',
            variant: 'destructive',
          });
          router.push('/home');
          return;
        }

        const groupRef = doc(db, 'groups', groupData.id);

        // Fetch received invitations
        const receivedQuery = query(
          collection(db, 'invitations'),
          where('toGroup', '==', groupRef)
        );
        const receivedSnapshot = await getDocs(receivedQuery);
        
        const receivedInvites = await Promise.all(
          receivedSnapshot.docs.map(async (inviteDoc) => {
            const inviteData = { id: inviteDoc.id, ...inviteDoc.data() } as Invitation;
            
            // Fetch from group data
            const fromGroupDoc = await getDoc(inviteData.fromGroup);
            let fromGroupData = { id: fromGroupDoc.id, ...fromGroupDoc.data() } as Group;

            // Hydrate from group members
            if (fromGroupData.members?.length) {
              const memberDocs = await Promise.all(
                fromGroupData.members.map((mref: any) => getDoc(doc(db, mref.path)))
              );
              fromGroupData.members = memberDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() } as UserType));
            }

            // Hydrate from group creator
            if (fromGroupData.creator && (fromGroupData.creator as any).path) {
              const creatorDoc = await getDoc(doc(db, (fromGroupData.creator as any).path));
              if (creatorDoc.exists()) {
                fromGroupData.creator = { id: creatorDoc.id, ...creatorDoc.data() } as UserType;
              }
            }

            return { ...inviteData, fromGroupData };
          })
        );

        // Fetch sent invitations
        const sentQuery = query(
          collection(db, 'invitations'),
          where('fromGroup', '==', groupRef)
        );
        const sentSnapshot = await getDocs(sentQuery);
        
        const sentInvites = await Promise.all(
          sentSnapshot.docs.map(async (inviteDoc) => {
            const inviteData = { id: inviteDoc.id, ...inviteDoc.data() } as Invitation;
            
            // Fetch to group data
            const toGroupDoc = await getDoc(inviteData.toGroup);
            let toGroupData = { id: toGroupDoc.id, ...toGroupDoc.data() } as Group;

            // Hydrate to group members
            if (toGroupData.members?.length) {
              const memberDocs = await Promise.all(
                toGroupData.members.map((mref: any) => getDoc(doc(db, mref.path)))
              );
              toGroupData.members = memberDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() } as UserType));
            }

            // Hydrate to group creator
            if (toGroupData.creator && (toGroupData.creator as any).path) {
              const creatorDoc = await getDoc(doc(db, (toGroupData.creator as any).path));
              if (creatorDoc.exists()) {
                toGroupData.creator = { id: creatorDoc.id, ...creatorDoc.data() } as UserType;
              }
            }

            return { ...inviteData, toGroupData };
          })
        );

        // Filter out invitations if group already has an active match
        if (groupData.hasActiveMatch) {
          console.log('Group has active match, clearing all invitations');
          setReceivedInvitations([]);
          setSentInvitations([]);
        } else {
          setReceivedInvitations(receivedInvites);
          setSentInvitations(sentInvites);
        }
      } catch (error) {
        console.error('Error fetching invitations:', error);
        toast({
          title: 'Error',
          description: 'Could not load invitations.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router, toast]);

  const handleInvitationResponse = async (invitationId: string, response: 'accepted' | 'rejected') => {
    if (!userGroup || !user) return;

    // Check if user has permission to respond to invitations based on group mode
    if (userGroup.mode === 'dictator') {
      const isGroupCreator = (userGroup.creator as UserType)?.id === user.id;
      if (!isGroupCreator) {
        toast({
          title: 'Permission Denied',
          description: 'Only the group creator can respond to invitations in Shot Caller mode.',
          variant: 'destructive',
        });
        return;
      }
    }

    // CRITICAL: Check if group already has an active match
    if (userGroup.hasActiveMatch && response === 'accepted') {
      toast({
        title: 'Already Matched',
        description: 'Your group already has an active match. You cannot accept new invitations.',
        variant: 'destructive',
      });
      // Refresh the page to clear stale invitations
      window.location.reload();
      return;
    }

    setActionLoading(invitationId);
    
    try {
      const invitation = receivedInvitations.find(inv => inv.id === invitationId);
      if (!invitation) return;

      // Update invitation status
      await updateDoc(doc(db, 'invitations', invitationId), {
        status: response,
        respondedAt: serverTimestamp()
      });

      if (response === 'accepted') {
        // Double-check if current group already has a match (server-side validation)
        const userGroupMatchesQuery = query(
          collection(db, 'matches'),
          where('groups', 'array-contains', doc(db, 'groups', userGroup.id))
        );
        const userGroupMatchesSnapshot = await getDocs(userGroupMatchesQuery);

        if (!userGroupMatchesSnapshot.empty) {
          toast({
            title: 'Already Matched',
            description: 'Your group already has an active match.',
            variant: 'destructive',
          });
          // Clear stale invitations and refresh
          setReceivedInvitations([]);
          return;
        }

        // Check if the sender group has already accepted another invitation
        const senderGroupRef = invitation.fromGroup;
        const senderMatchesQuery = query(
          collection(db, 'matches'),
          where('groups', 'array-contains', senderGroupRef)
        );
        const senderMatchesSnapshot = await getDocs(senderMatchesQuery);

        if (!senderMatchesSnapshot.empty) {
          toast({
            title: 'Group Already Matched',
            description: 'This group has already matched with someone else.',
            variant: 'destructive',
          });
          // Remove this invitation since the sender is no longer available
          setReceivedInvitations(prev => 
            prev.filter(inv => inv.id !== invitationId)
          );
          return;
        }

        // Create match - venue suggestion will be handled by server action
        const userGroupRef = doc(db, 'groups', userGroup.id);
        const matchDocRef = await addDoc(collection(db, 'matches'), {
          groups: [userGroupRef, senderGroupRef],
          createdAt: serverTimestamp()
        });

        // Add venue suggestion asynchronously (non-blocking)
        addVenueSuggestionToMatch(matchDocRef.id).catch(error => 
          console.error('Failed to add venue suggestion:', error)
        );

        // Clear all other pending invitations for both groups BEFORE updating UI
        try {
          await clearAllPendingInvitations(userGroupRef, senderGroupRef);
          console.log('Cleared pending invitations after match creation');
        } catch (error) {
          console.error('Failed to clear pending invitations (non-critical):', error);
        }

        // Update both groups to mark them as having active matches
        await Promise.all([
          updateDoc(userGroupRef, { hasActiveMatch: true }),
          updateDoc(senderGroupRef, { hasActiveMatch: true })
        ]);

        toast({
          title: 'Match Created! 🎉',
          description: `You're now matched with ${invitation.fromGroupData.name}!`,
        });

        // Clear ALL pending invitations from UI since match was created
        setReceivedInvitations([]);
        
      } else {
        toast({
          title: 'Invitation Rejected',
          description: `You rejected the invitation from ${invitation.fromGroupData.name}.`,
        });

        // Only remove the rejected invitation
        setReceivedInvitations(prev => 
          prev.filter(inv => inv.id !== invitationId)
        );
      }

    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast({
        title: 'Error',
        description: 'Could not process your response.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
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

  const formatTimestamp = (timestamp: any) => {
    try {
      // Handle Firebase Timestamp
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        return format(new Date(timestamp.seconds * 1000), 'PPp');
      }
      // Handle Date object
      if (timestamp instanceof Date) {
        return format(timestamp, 'PPp');
      }
      // Handle string timestamp
      if (typeof timestamp === 'string') {
        return format(new Date(timestamp), 'PPp');
      }
      // Handle number timestamp (milliseconds)
      if (typeof timestamp === 'number') {
        return format(new Date(timestamp), 'PPp');
      }
      return 'Unknown date';
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex h-screen flex-col">
        <Header title="Invitations" backHref="/home" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header title="Invitations" backHref="/home" />
      
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="received" className="flex flex-col h-full">
          <div className="p-4 bg-white border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">
                Received ({receivedInvitations.length})
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent ({sentInvitations.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="received" className="flex-1 overflow-y-auto p-4 space-y-4">
            {receivedInvitations.length > 0 ? (
              receivedInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">Invitation from {invitation.fromGroupData.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTimestamp(invitation.createdAt)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>

                    <div className="flex gap-4 mb-4">
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
                        <p className="text-sm text-muted-foreground">
                          by {(invitation.fromGroupData.creator as UserType)?.name || 'Unknown'}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{invitation.fromGroupData.neighborhood}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>{formatIntent(invitation.fromGroupData.intent)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{(invitation.fromGroupData.members as UserType[]).length}/{invitation.fromGroupData.size} members</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {invitation.fromGroupData?.vibes?.length > 0 
                            ? invitation.fromGroupData?.vibes?.join(', ') 
                            : invitation.fromGroupData?.vibe || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {invitation.status === 'pending' && (() => {
                      if (!userGroup) return null;
                      const isGroupCreator = (userGroup.creator as UserType)?.id === user?.id;
                      const canRespond = userGroup.mode === 'democracy' || (userGroup.mode === 'dictator' && isGroupCreator);
                      
                      if (!canRespond) {
                        return (
                          <div className="text-center text-sm text-muted-foreground py-2">
                            Only the group creator can respond to invitations in Shot Caller mode.
                          </div>
                        );
                      }
                      
                      return (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInvitationResponse(invitation.id, 'rejected')}
                            disabled={actionLoading === invitation.id}
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                            disabled={actionLoading === invitation.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === invitation.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Accept
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Invitations</h3>
                <p className="text-muted-foreground">
                  You haven't received any invitations yet.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="flex-1 overflow-y-auto p-4 space-y-4">
            {sentInvitations.length > 0 ? (
              sentInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">Invitation to {invitation.toGroupData.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatTimestamp(invitation.createdAt)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(invitation.status)}
                    </div>

                    <div className="flex gap-4">
                      {/* Group Picture */}
                      <div className="w-16 h-16 flex-shrink-0 relative bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                        {invitation.toGroupData.pictureUrl ? (
                          <Image
                            src={invitation.toGroupData.pictureUrl}
                            alt={invitation.toGroupData.name}
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
                        <p className="text-sm text-muted-foreground">
                          by {(invitation.toGroupData.creator as UserType)?.name || 'Unknown'}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{invitation.toGroupData.neighborhood}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span>{formatIntent(invitation.toGroupData.intent)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{(invitation.toGroupData.members as UserType[]).length}/{invitation.toGroupData.size} members</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {invitation.toGroupData?.vibes?.length > 0 
                            ? invitation.toGroupData?.vibes?.join(', ') 
                            : invitation.toGroupData?.vibe || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Sent Invitations</h3>
                <p className="text-muted-foreground">
                  You haven't sent any invitations yet.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
