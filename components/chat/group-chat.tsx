"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Video,
  Plus,
  Mic,
  MapPin,
  ExternalLink,
  ArrowRightFromLine,
} from "lucide-react";
import {
  getMatchMessages,
  sendMessage,
  getChatParticipants,
  simulateIncomingMessage,
  suggestAlternativeVenue,
  getBannedParticipants,
  banParticipant,
  type Message,
  type ChatParticipant,
} from "@/lib/messages";
import { leaveGroup, removeMember } from "@/lib/groups";
import type { Group } from "@/lib/groups";
import type { GroupMatch } from "@/lib/matching";
import { useAuth } from "@/hooks/use-auth";

interface GroupChatProps {
  match: GroupMatch;
  currentGroup: Group;
  otherGroup: Group;
  onBack: () => void;
}

export function GroupChat({
  match,
  currentGroup,
  otherGroup,
  onBack,
}: GroupChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showVenueDetails, setShowVenueDetails] = useState(false);
  const [venueMessage, setVenueMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Load initial data
    const chatParticipants = getChatParticipants(currentGroup, otherGroup);
    const banned = new Set(getBannedParticipants(match.id));
    setParticipants(chatParticipants.filter((p) => !banned.has(p.id)));

    const initialMessages = getMatchMessages(match.id);
    setMessages(initialMessages);

    const interval = setInterval(() => {
      const updatedMessages = getMatchMessages(match.id);
      setMessages(updatedMessages);

      // Simulate incoming messages less frequently for single-user groups
      if (user && chatParticipants.length > 1 && Math.random() > 0.85) {
        simulateIncomingMessage(match.id, chatParticipants, user.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [match.id, currentGroup, otherGroup, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);

    const result = await sendMessage(
      match.id,
      user.id,
      user.name,
      currentGroup.id,
      newMessage.trim()
    );

    if (result.success) {
      setNewMessage("");
      // Refresh messages
      const updatedMessages = getMatchMessages(match.id);
      setMessages(updatedMessages);
    }

    setIsSending(false);
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    await leaveGroup(user.id);
    onBack();
  };

  const handleKickUser = async (targetUserId: number) => {
    if (!user) return;
    // Only allow creator of currentGroup to kick
    if (currentGroup.creatorId !== user.id) return;

    // Persistently ban from this match chat and remove from group storage
    banParticipant(match.id, targetUserId);
    await removeMember(currentGroup.id, targetUserId, user.id);

    // Refresh participants list
    const chatParticipants = getChatParticipants(currentGroup, otherGroup);
    const banned = new Set(getBannedParticipants(match.id));
    setParticipants(chatParticipants.filter((p) => !banned.has(p.id)));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageSender = (message: Message): "user" | "other" | "system" => {
    if (
      message.messageType === "system" ||
      message.messageType === "venue_suggestion"
    ) {
      return "system";
    }
    return message.senderId === user?.id ? "user" : "other";
  };

  const getSenderInfo = (message: Message) => {
    if (
      message.messageType === "system" ||
      message.messageType === "venue_suggestion"
    ) {
      return { name: "Corner Of", groupName: "" };
    }

    const participant = participants.find((p) => p.id === message.senderId);
    return {
      name: participant?.name || message.senderName,
      groupName: participant?.groupName || "",
    };
  };

  const handleSuggestAlternative = async (originalMessage: Message) => {
    if (!user) return;

    const result = await suggestAlternativeVenue(
      match.id,
      currentGroup,
      otherGroup,
      user.id,
      user.name,
      currentGroup.id
    );

    if (result.success) {
      // Refresh messages
      const updatedMessages = getMatchMessages(match.id);
      setMessages(updatedMessages);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-muted overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>

        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            <Avatar className="w-8 h-8 border-2 border-background">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {currentGroup.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Avatar className="w-8 h-8 border-2 border-background">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {otherGroup.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <button className="text-center" onClick={() => setShowMembers(true)}>
            <h2 className="font-semibold text-sm text-foreground">
              {currentGroup.name} + {otherGroup.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {participants.length} people
            </p>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={handleLeaveGroup}
          >
            <ArrowRightFromLine />
          </Button>
        </div>
      </div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Group members</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {participants.map((p) => {
              const isSelf = p.id === user?.id;
              const canKick =
                !!user && currentGroup.creatorId === user.id && !isSelf;
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={p.profilePhotoUrl || "/placeholder.svg"}
                      />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {p.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.groupName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelf ? (
                      <Button
                        variant="outline"
                        className="text-red-500 border-red-500 hover:bg-red-800 hover:text-white"
                        size="sm"
                        onClick={handleLeaveGroup}
                      >
                        Leave
                      </Button>
                    ) : canKick ? (
                      <Button
                        // variant="destructive"
                        size="sm"
                        className="bg-red-500 text-white hover:bg-red-800 hover:text-white"
                        onClick={() => handleKickUser(p.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setShowMembers(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Venue Details Dialog */}
      <Dialog open={showVenueDetails} onOpenChange={setShowVenueDetails}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Venue details</DialogTitle>
          </DialogHeader>
          {venueMessage?.venueData ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {venueMessage.venueData.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {venueMessage.venueData.description}
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{venueMessage.venueData.address}</span>
              </div>
              <div className="flex items-center gap-2">
                {venueMessage.venueData.priceRange && (
                  <Badge variant="outline" className="text-xs">
                    {venueMessage.venueData.priceRange}
                  </Badge>
                )}
                {venueMessage.venueData.bestFor && (
                  <Badge variant="secondary" className="text-xs">
                    {venueMessage.venueData.bestFor}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No details available.
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setShowVenueDetails(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center">
            <Card className="max-w-sm p-4 bg-muted/50 border-muted">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Welcome to your group chat! Start the conversation and invite
                  others to join.
                </p>
              </div>
            </Card>
          </div>
        )}

        {messages.map((message) => {
          const sender = getMessageSender(message);
          const senderInfo = getSenderInfo(message);

          if (message.messageType === "venue_suggestion" && message.venueData) {
            return (
              <div key={message.id} className="flex justify-center">
                <Card className="max-w-sm p-4 bg-accent/10 border-accent/20">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-accent rounded-2xl mx-auto flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {message.venueData.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {message.venueData.description}
                      </p>
                      <div className="flex items-center justify-center space-x-1 mt-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{message.venueData.address}</span>
                      </div>
                      {message.venueData.priceRange && (
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {message.venueData.priceRange}
                          </Badge>
                          {message.venueData.bestFor && (
                            <Badge variant="secondary" className="text-xs">
                              {message.venueData.bestFor}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => {
                          setVenueMessage(message);
                          setShowVenueDetails(true);
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${
                sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-xs space-y-1">
                {sender === "other" && (
                  <div className="flex items-center space-x-2 px-1">
                    <span className="text-xs text-muted-foreground">
                      {senderInfo.name}
                    </span>
                    {senderInfo.groupName && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {senderInfo.groupName}
                      </Badge>
                    )}
                  </div>
                )}
                <div
                  className={`message-bubble ${
                    sender === "user"
                      ? "message-sent border-1 border-black"
                      : sender === "system"
                      ? "bg-muted text-muted-foreground text-center"
                      : "message-received border-1 border-blue-500"
                  } `}
                >
                  <p className="text-sm">{message.messageText}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex items-center space-x-2">
          {/* <Button variant="ghost" size="sm" className="p-2">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </Button> */}

          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              className="chat-input pr-12"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={isSending}
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-primary hover:bg-primary/90"
            >
              <span className="text-xs text-primary-foreground">→</span>
            </Button>
            {/* {newMessage.trim() ? (
              <Button
                onClick={handleSend}
                disabled={isSending}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-primary hover:bg-primary/90"
              >
                <span className="text-xs text-primary-foreground">→</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}
