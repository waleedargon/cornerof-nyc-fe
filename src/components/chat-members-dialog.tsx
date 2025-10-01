'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Group, User } from '@/lib/types';

interface ChatMembersDialogProps {
  userGroup: Group;
  otherGroup: Group;
  currentUser: User;
}

export function ChatMembersDialog({ userGroup, otherGroup, currentUser }: ChatMembersDialogProps) {
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isCurrentUser = (user: User) => {
    return user.id === currentUser.id;
  };

  const renderGroupMembers = (group: Group, isUserGroup: boolean) => {
    const members = group.members as User[];
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">
            {group.name}
          </h3>
          <Badge variant={isUserGroup ? "default" : "secondary"} className="text-xs">
            {isUserGroup ? "Your Group" : "Their Group"}
          </Badge>
        </div>
        
        <div className="grid gap-3">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {member.name}
                    {isCurrentUser(member) && (
                      <span className="text-muted-foreground ml-1">(You)</span>
                    )}
                  </p>
                  {(group.creator as User)?.id === member.id && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      Creator
                    </Badge>
                  )}
                </div>
                
                {member.age && (
                  <p className="text-xs text-muted-foreground">
                    Age {member.age}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalMembers = (userGroup.members?.length || 0) + (otherGroup.members?.length || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          <Users className="h-3 w-3 mr-1" />
          {totalMembers} members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Members
          </DialogTitle>
          <DialogDescription>
            Members from both groups in this match
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
          {/* User's Group */}
          {renderGroupMembers(userGroup, true)}
          
          <Separator />
          
          {/* Other Group */}
          {renderGroupMembers(otherGroup, false)}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t text-xs text-muted-foreground">
          <span>{userGroup.members?.length || 0} from {userGroup.name}</span>
          <span>{otherGroup.members?.length || 0} from {otherGroup.name}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
