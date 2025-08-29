"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Users } from "lucide-react";
import { getMutualMatches, type GroupMatch } from "@/lib/matching";
import { getMatchMessages } from "@/lib/messages";
import type { Group } from "@/lib/groups";

interface MatchesListProps {
  currentGroup: Group;
  onBack: () => void;
  onSelectMatch: (match: GroupMatch, otherGroup: Group) => void;
  onOpenGroupChat?: () => void;
}

export function MatchesList({
  currentGroup,
  onBack,
  onSelectMatch,
  onOpenGroupChat,
}: MatchesListProps) {
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [currentGroup.id]);

  const loadMatches = async () => {
    setIsLoading(true);
    const mutualMatches = getMutualMatches(currentGroup.id);
    setMatches(mutualMatches);
    setIsLoading(false);
  };

  const getOtherGroup = (match: GroupMatch): Group => {
    // For MVP, create mock other group data
    const otherGroupId =
      match.group1Id === currentGroup.id ? match.group2Id : match.group1Id;

    return {
      id: otherGroupId,
      name: `Group ${otherGroupId}`,
      creatorId: otherGroupId + 1000,
      groupSize: 4,
      neighborhood: "East Village",
      vibe: "Chill drinks",
      lookingFor: "Mixed group",
      shareLink: `corner-of://join/group${otherGroupId}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: otherGroupId + 100,
          groupId: otherGroupId,
          userId: otherGroupId + 200,
          joinedAt: new Date().toISOString(),
          user: {
            id: otherGroupId + 200,
            name: "Alex",
            profilePhotoUrl: undefined,
          },
        },
      ],
    };
  };

  const getLastMessage = (matchId: number): string => {
    const messages = getMatchMessages(matchId);
    if (messages.length === 0) return "Start chatting!";

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.messageType === "venue_suggestion") {
      return "📍 Venue recommendation";
    }
    return lastMessage.messageText;
  };

  const getMessageCount = (matchId: number): number => {
    return getMatchMessages(matchId).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-none mx-auto flex items-center justify-center animate-pulse">
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Loading Matches
            </h2>
            <p className="text-sm text-muted-foreground">
              Finding your conversations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-sm mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Chat</h1>
          </div>

          <Card className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-none mx-auto flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Group Chat</h3>
              <p className="text-sm text-muted-foreground">
                Start chatting with your group members and share the link to
                invite others!
              </p>
            </div>
            {onOpenGroupChat && (
              <Button
                onClick={onOpenGroupChat}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Group Chat
              </Button>
            )}
          </Card>

          <Card className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-none mx-auto flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                No matches yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Start matching with other groups to unlock more conversations!
              </p>
            </div>
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full bg-transparent"
            >
              Start Matching
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Matches</h1>
        </div>

        {onOpenGroupChat && (
          <Card
            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={onOpenGroupChat}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-none flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {currentGroup.name} Group Chat
                </h3>
                <p className="text-sm text-muted-foreground">
                  Chat with your group members
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {matches.map((match) => {
            const otherGroup = getOtherGroup(match);
            const lastMessage = getLastMessage(match.id);
            const messageCount = getMessageCount(match.id);
            const hasUnread = messageCount > 0;

            return (
              <Card
                key={match.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelectMatch(match, otherGroup)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="flex -space-x-2">
                      <Avatar className="w-10 h-10 border-2 border-background">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                          {otherGroup.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="w-10 h-10 border-2 border-background">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <Users className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {currentGroup.name} + {otherGroup.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {match.matchedAt
                          ? new Date(match.matchedAt).toLocaleDateString()
                          : "Today"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessage}
                      </p>
                      {messageCount > 0 && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          {messageCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
