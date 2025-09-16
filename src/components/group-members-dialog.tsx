'use client';

import { useState } from 'react';
import { Users, Crown, UserMinus, LogOut } from 'lucide-react';
import { doc, updateDoc, arrayRemove, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { leaveGroup } from '@/lib/actions';
import type { Group, User as UserType } from '@/lib/types';

interface GroupMembersDialogProps {
  group: Group;
  currentUser: UserType;
  onGroupUpdated: () => void;
}

export function GroupMembersDialog({ group, currentUser, onGroupUpdated }: GroupMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const isAdmin = (group.creator as UserType)?.id === currentUser.id;
  const members = group.members as UserType[];
  
  console.log('Group Members Dialog:', { 
    isAdmin, 
    currentUserId: currentUser.id, 
    creatorId: (group.creator as UserType)?.id,
    membersCount: members.length 
  });

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!isAdmin || memberId === currentUser.id) {
      console.log('Cannot kick member:', { isAdmin, memberId, currentUserId: currentUser.id });
      return;
    }

    setLoading(memberId);
    try {
      const memberRef = doc(db, 'users', memberId);
      const groupRef = doc(db, 'groups', group.id);

      console.log('Kicking member:', { memberId, memberName, groupId: group.id });
      
      await updateDoc(groupRef, {
        members: arrayRemove(memberRef)
      });

      toast({
        title: 'Member Removed',
        description: `${memberName} has been removed from the group.`,
      });

      onGroupUpdated();
    } catch (error) {
      console.error('Error kicking member:', error);
      toast({
        title: 'Error',
        description: 'Could not remove member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleLeaveGroup = async () => {
    setLoading(currentUser.id);
    try {
      console.log('Leaving group:', { groupId: group.id, userId: currentUser.id });
      const result = await leaveGroup(group.id, currentUser.id);
      console.log('Leave group result:', result);
      
      toast({
        title: 'Left Group',
        description: 'You have successfully left the group.',
      });

      // Close dialog and refresh
      setOpen(false);
      onGroupUpdated();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: 'Error',
        description: 'Could not leave group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          View Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Members ({members.length})
          </DialogTitle>
          <DialogDescription>
            {isAdmin ? 'Manage your group members' : 'View group members'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{member.name}</p>
                  {(group.creator as UserType)?.id === member.id && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <Crown className="h-3 w-3" />
                      Admin
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && member.id !== currentUser.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      disabled={loading === member.id}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {member.name} from the group? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleKickMember(member.id, member.name)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col gap-2">
          {!isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={loading === currentUser.id}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to leave this group? You'll need to be invited again to rejoin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeaveGroup}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Leave Group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
