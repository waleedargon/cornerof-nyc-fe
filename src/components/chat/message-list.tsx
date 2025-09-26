'use client';

import { memo } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';
import type { Message, User } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
}

const MessageItem = memo(({ message, isCurrentUser }: { 
  message: Message; 
  isCurrentUser: boolean;
}) => {
  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isCurrentUser ? "justify-end" : "justify-start"
    )}>
      {!isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
          {message.user?.avatarUrl ? (
            <OptimizedImage
              src={message.user.avatarUrl}
              alt={message.user.name}
              width={32}
              height={32}
              className="object-cover"
              sizes="32px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
              {message.user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      )}
      
      <div className={cn(
        "max-w-[75%] rounded-lg px-4 py-2 text-sm",
        message.sender === 'system' 
          ? "bg-blue-50 text-blue-800 border border-blue-200 mx-auto text-center"
          : isCurrentUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
      )}>
        {message.sender !== 'system' && !isCurrentUser && (
          <div className="text-xs font-medium mb-1 opacity-70">
            {message.user?.name}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {message.text}
        </div>
        <div className={cn(
          "text-xs mt-1 opacity-60",
          message.sender === 'system' ? "text-center" : ""
        )}>
          {message.timestamp}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 overflow-hidden">
          {message.user?.avatarUrl ? (
            <OptimizedImage
              src={message.user.avatarUrl}
              alt={message.user.name}
              width={32}
              height={32}
              className="object-cover"
              sizes="32px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-primary-foreground">
              {message.user?.name?.charAt(0)?.toUpperCase() || 'Y'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export const MessageList = memo(({ messages, currentUserId }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isCurrentUser={message.user?.id === currentUserId}
        />
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
