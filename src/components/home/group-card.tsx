'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  MapPin, 
  Smile, 
  Target, 
  Eye, 
  EyeOff, 
  Crown, 
  Mail, 
  Flag, 
  Search, 
  User,
  Edit
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { EditGroupDialog } from '@/components/edit-group-dialog';
import { GroupMembersDialog } from '@/components/group-members-dialog';
import { InviteDialog } from '@/components/invite-dialog';
import { AddGroupDialog } from '@/components/add-group-dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Group, User as UserType } from '@/lib/types';

interface GroupCardProps {
  group: Group | null;
  user: UserType | null;
  receivedInvitationsCount: number;
  onGroupUpdate?: () => void;
}

export function GroupCard({ 
  group: userGroup, 
  user, 
  receivedInvitationsCount,
  onGroupUpdate 
}: GroupCardProps) {
  const { toast } = useToast();
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const handleVisibilityToggle = async (isOpen: boolean) => {
    if (!userGroup || isUpdatingVisibility) return;

    setIsUpdatingVisibility(true);
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
    } finally {
      setIsUpdatingVisibility(false);
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

  return (
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
                  onGroupUpdated={onGroupUpdate || (() => window.location.reload())}
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
                    <OptimizedImage
                      src={userGroup.pictureUrl}
                      alt={userGroup.name}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                      sizes="80px"
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
                      <Crown className="h-4 w-4 text-yellow-500" />
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
                    disabled={isUpdatingVisibility}
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>

            {/* Group Details Grid */}
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

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Members</h4>
                <GroupMembersDialog
                  group={userGroup}
                  currentUser={user!}
                  onGroupUpdated={onGroupUpdate || (() => window.location.reload())}
                />
              </div>
              <div className="flex items-center justify-start -space-x-2">
                {userGroup.members && userGroup.members.length > 0 ? (
                  userGroup.members.map((member) =>
                    (member as UserType).avatarUrl ? (
                      <OptimizedImage
                        key={(member as UserType).id}
                        src={(member as UserType).avatarUrl!}
                        alt={(member as UserType).name}
                        width={40}
                        height={40}
                        className="aspect-square rounded-full object-cover border-2 border-background"
                        title={(member as UserType).name}
                        sizes="40px"
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
  );
}
