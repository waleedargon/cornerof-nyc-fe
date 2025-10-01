'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SendHorizontal, User as UserIcon, Smile, ArrowLeft, Trash2, Flag } from 'lucide-react';
import Image from 'next/image';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, DocumentReference, where, getDocs } from 'firebase/firestore';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Message, Match, Group, User } from '@/lib/types';
import { ReportMessageDialog } from '@/components/report-message-dialog';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { VenueSuggestion } from '@/components/venue-suggestion';
import { ChatMembersDialog } from '@/components/chat-members-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteMatch } from '@/lib/actions';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [otherGroup, setOtherGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportData, setReportData] = useState<{
    messageId: string;
    reportedUserId: string;
    messageText: string;
    reportedUserName: string;
  } | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const matchId = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user || !matchId) return;

    const fetchMatchAndGroups = async () => {
      setLoading(true);
      try {
        const matchRef = doc(db, 'matches', matchId);
        const matchDoc = await getDoc(matchRef);

        if (!matchDoc.exists()) {
          console.error("Match not found");
          setLoading(false);
          return;
        }

        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatch(matchData);

        // Find the user's group ID first
        const userGroupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', doc(db, 'users', user.id)));
        const userGroupSnapshot = await getDocs(userGroupsQuery);

        if (userGroupSnapshot.empty) {
          console.error("User group not found");
          setLoading(false);
          return;
        }
        const userGroupId = userGroupSnapshot.docs[0].id;

        // Identify which group is which
        const groupRefs = matchData.groups as DocumentReference<Group>[];
        const userGroupRef = groupRefs.find(ref => ref.id === userGroupId);
        const otherGroupRef = groupRefs.find(ref => ref.id !== userGroupId);

        if (!userGroupRef || !otherGroupRef) {
          console.error("Could not identify both groups in the match");
          setLoading(false);
          return;
        }

        // Fetch both group documents
        const [userGroupDoc, otherGroupDoc] = await Promise.all([
          getDoc(userGroupRef),
          getDoc(otherGroupRef)
        ]);

        if (userGroupDoc.exists()) {
          const groupData = { id: userGroupDoc.id, ...userGroupDoc.data() } as Group;
          if (groupData.members && groupData.members.length > 0) {
            const memberPromises = groupData.members.map(memberRef => getDoc(doc(db, (memberRef as DocumentReference).path)));
            const memberDocs = await Promise.all(memberPromises);
            groupData.members = memberDocs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          }
          setUserGroup(groupData);
        }

        if (otherGroupDoc.exists()) {
          const groupData = { id: otherGroupDoc.id, ...otherGroupDoc.data() } as Group;

          if (groupData.members && groupData.members.length > 0) {
            const memberPromises = groupData.members.map(memberRef => getDoc(doc(db, (memberRef as DocumentReference).path)));
            const memberDocs = await Promise.all(memberPromises);
            groupData.members = memberDocs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          }
          setOtherGroup(groupData);
        }

      } catch (error) {
        console.error("Error fetching match data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchAndGroups();
  }, [matchId, user]);

  useEffect(() => {
    if (!matchId || !user || !userGroup || !otherGroup) return;

    // Subscribe to messages
    const messagesRef = collection(db, 'matches', matchId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const msgs: Message[] = [];
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const userRef = data.user as DocumentReference<User>;
        const userDoc = await getDoc(userRef);
        const userData = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : { id: 'unknown', name: 'Unknown User' };

        // Determine if the sender is part of the user's group
        const userGroupMemberIds = userGroup.members.map(m => (m as User).id);
        const senderIsUser = userGroupMemberIds.includes(userData.id);

        msgs.push({
          id: docSnapshot.id,
          text: data.text,
          sender: userData.id === user.id ? 'user' : 'other', // This determines alignment
          timestamp: data.timestamp?.toDate().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }) || '',
          user: userData,
          group: senderIsUser ? userGroup : otherGroup,
        });
      }
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [matchId, user, userGroup, otherGroup]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !match) return;

    const messagesRef = collection(db, 'matches', match.id, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      user: doc(db, 'users', user.id),
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setNewMessage(prevInput => prevInput + emojiObject.emoji);
  };

  const handleDeleteMatchClick = () => {
    if (!user || !match || !userGroup || !otherGroup) return;

    // Check if user is a creator of either group
    const isUserGroupCreator = (userGroup.creator as User)?.id === user.id;
    const isOtherGroupCreator = (otherGroup.creator as User)?.id === user.id;

    if (!isUserGroupCreator && !isOtherGroupCreator) {
      toast({
        title: 'Permission Denied',
        description: 'Only group creators can end matches.',
        variant: 'destructive',
      });
      return;
    }

    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !match) return;

    setDeleteLoading(true);
    setShowDeleteDialog(false);

    try {
      const result = await deleteMatch(match.id, user.id);

      if (result.success) {
        toast({
          title: 'Match Ended',
          description: result.message,
        });
        router.push('/home');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      toast({
        title: 'Error',
        description: 'Failed to end match. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReportMessage = (message: Message) => {
    if (!user || !userGroup || message.user.id === user.id) return;

    setReportData({
      messageId: message.id,
      reportedUserId: message.user.id,
      messageText: typeof message.text === 'string' ? message.text : 'Message content',
      reportedUserName: message.user.name,
    });
    setShowReportDialog(true);
  };

  if (loading || authLoading) {
    return <LoadingSkeleton />;
  }

  if (!match || !otherGroup || !userGroup) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Header title="Chat" backHref="/home" />
        <div className="flex-1 flex items-center justify-center">
          <p>Match not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Custom header with both groups */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/home')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center gap-1 text-center">
            <div className="text-sm">
              <span className="font-semibold text-blue-600">{userGroup.name}</span>
              <span className="text-muted-foreground"> + </span>
              <span className="font-semibold text-blue-600">{otherGroup.name}</span>
            </div>
            {user && (
              <ChatMembersDialog 
                userGroup={userGroup} 
                otherGroup={otherGroup} 
                currentUser={user}
              />
            )}
          </div>

          {/* Delete match button - only show for group creators */}
          {user && userGroup && otherGroup && (
            ((userGroup.creator as User)?.id === user.id || (otherGroup.creator as User)?.id === user.id) ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteMatchClick}
                disabled={deleteLoading}
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <div className="w-8" />
            )
          )}
        </div>
      </div>

      {/* old chat ui */}
      {/* <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {match.venueSuggestion && (
          <VenueSuggestion match={match} />
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex flex-col gap-1',
              message.user.id === user.id ? 'items-end' : 'items-start'
            )}
          >
            <div className={cn('flex items-center gap-2 mb-1', message.user.id === user.id ? 'flex-row-reverse' : 'flex-row')}>
              {message.user.avatarUrl ? (
                <Image
                  src={message.user.avatarUrl}
                  alt={message.user.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                  data-ai-hint="profile avatar"
                />
              ) : (
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-gray-600">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
              <span className="text-xs font-medium text-gray-600">
                {message.user.name}
              </span>
              <span className="text-xs text-gray-400">
                {message.group?.name}
              </span>
            </div>
            <div className={cn(
              'relative group flex items-start gap-2',
              message.user.id === user.id ? 'justify-end' : 'justify-start'
            )}>
              <div
                className={cn(
                  'max-w-[70%] px-4 py-2 rounded-lg',
                  message.user.id === user.id
                    ? 'bg-blue-500 text-white border border-black rounded-br-sm'
                    : 'bg-white text-blue-600 border-2 border-blue-500 rounded-bl-sm'
                )}
              >
                <p className="text-sm mb-1">{message.text}</p>
                <span className={cn(
                  "text-xs block",
                  message.user.id === user.id
                    ? 'text-blue-100 text-right'
                    : 'text-blue-400 text-left'
                )}>
                  {message.timestamp}
                </span>
              </div>

              {message.user.id !== user.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReportMessage(message)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 border border-red-200 rounded-full flex-shrink-0 mt-1"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div> */}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <VenueSuggestion match={match} />

        {messages.map((message) => {
          const isSender = message.user.id === user.id;

          return (
            <div
              key={message.id}
              className={cn(
                'flex flex-col gap-1',
                isSender ? 'items-end' : 'items-start'
              )}
            >
              {/* Sender Info */}
              <div
                className={cn(
                  'flex items-center gap-2 mb-1',
                  isSender ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {message.user.avatarUrl ? (
                  <Image
                    src={message.user.avatarUrl}
                    alt={message.user.name}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-300 text-gray-600">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
                <span className="text-xs font-medium text-gray-600">
                  {message.user.name}
                </span>
                <span className="text-xs text-gray-400">
                  {message.group?.name}
                </span>
              </div>

              {/* Chat Bubble and Actions */}
              <div
                className={cn(
                  'flex items-start gap-2 w-full',
                  isSender ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    // ✅ These are the key classes that fix the layout
                    'inline-block max-w-[80%] px-4 py-2 rounded-lg break-words',
                    'bg-white text-blue-600 border-2 border-blue-500 rounded-bl-sm',
                    isSender &&
                    'bg-blue-500 text-white border border-black rounded-br-sm'
                  )}
                >
                  <p className="text-sm mb-1">{message.text}</p>
                  <span
                    className={cn(
                      'text-xs block',
                      isSender ? 'text-blue-100 text-right' : 'text-blue-400 text-left'
                    )}
                  >
                    {message.timestamp}
                  </span>
                </div>

                {!isSender && <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReportMessage(message)}
                  className="h-6 w-6 transition-opacity bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 border border-red-200 rounded-full flex-shrink-0 mt-1"
                >
                  <Flag className="h-3 w-3" />
                </Button>}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="sticky bottom-0 border-t bg-background p-2">
        <div className="relative flex items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
              >
                <Smile className="h-5 w-5" />
                <span className="sr-only">Add emoji</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full border-none p-0">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </PopoverContent>
          </Popover>
          <Input
            placeholder="Type a message..."
            className=""
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 h-8 w-8 rounded-full ml-2"
          >
            <SendHorizontal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Match</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this match? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Message Dialog */}
      {reportData && (
        <ReportMessageDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          messageId={reportData.messageId}
          matchId={matchId}
          reportedUserId={reportData.reportedUserId}
          reporterUserId={user?.id || ''}
          reporterGroupId={userGroup?.id || ''}
          messageText={reportData.messageText}
          reportedUserName={reportData.reportedUserName}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header skeleton */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="text-center mt-1">
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Venue suggestion skeleton */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
          <div className="flex items-center justify-center">
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded" />
        </div>

        {/* Message skeletons */}
        <div className="flex flex-col gap-1 items-start max-w-[70%]">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="w-full rounded-lg border-2 border-blue-500 bg-white p-4 overflow-hidden">
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end max-w-[70%] ml-auto">
          <div className="flex items-center gap-2 mb-1 flex-row-reverse">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="w-full rounded-lg border border-black bg-blue-500 p-4 overflow-hidden">
            <div className="h-3 w-full mb-2 bg-blue-400 rounded animate-pulse" />
            <div className="h-3 w-16 ml-auto bg-blue-400 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col gap-1 items-start max-w-[70%]">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="w-full rounded-lg border-2 border-blue-500 bg-white p-4 overflow-hidden">
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="sticky bottom-0 border-t bg-background p-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 flex-1 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}