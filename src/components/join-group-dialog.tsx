'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { UserPlus, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { User, Group } from '@/lib/types';
import { AdminLogger } from '@/lib/admin-logger';

const formSchema = z.object({
  inviteCode: z.string().min(6, 'Invite code must be at least 6 characters.').max(20, 'Invite code must be less than 20 characters.'),
});

type FormData = z.infer<typeof formSchema>;

interface JoinGroupDialogProps {
  user: User;
  onGroupJoined?: () => void;
}

export function JoinGroupDialog({ user, onGroupJoined }: JoinGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inviteCode: '',
    },
  });

  async function onSubmit(values: FormData) {
    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.id);

      // Check if user is already in a group
      const userGroupsQuery = query(
        collection(db, 'groups'), 
        where('members', 'array-contains', userRef)
      );
      const existingGroupSnapshot = await getDocs(userGroupsQuery);

      if (!existingGroupSnapshot.empty) {
        toast({
          title: 'Already in a group',
          description: 'You can only be in one group at a time.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Find group with matching invite code
      const groupQuery = query(
        collection(db, 'groups'), 
        where('inviteCode', '==', values.inviteCode.trim())
      );
      const groupSnapshot = await getDocs(groupQuery);

      if (groupSnapshot.empty) {
        toast({
          title: 'Invalid invite code',
          description: 'No group found with this invite code. Please check and try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const groupDoc = groupSnapshot.docs[0];
      const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;

      // Check if group is full
      if (groupData.members && groupData.members.length >= groupData.size) {
        toast({
          title: 'Group is full',
          description: 'This group has reached its maximum capacity.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Add user to the group
      const groupRef = doc(db, 'groups', groupData.id);
      await updateDoc(groupRef, {
        members: arrayUnion(userRef)
      });

      // Log the activity
      await AdminLogger.userJoinedGroup(groupData.id, groupData.name, user.id, user.name);

      toast({
        title: 'Success!',
        description: `You've joined "${groupData.name}"! Welcome to the group.`,
      });

      form.reset();
      setOpen(false);
      
      // Call the callback to refresh the page/data
      if (onGroupJoined) {
        onGroupJoined();
      }

    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: 'Error',
        description: 'Failed to join group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Join Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join an Existing Group</DialogTitle>
          <DialogDescription>
            Enter the group code shared by a group to join them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Code</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="text-center font-mono text-lg tracking-wider"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    Ask the group creator for their group code.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Group
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
