"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Share,
  Users,
  MapPin,
  Heart,
  Settings,
  MessageCircle,
} from "lucide-react";
import { getMutualMatches } from "@/lib/matching";
import type { Group } from "@/lib/groups";

interface GroupDashboardProps {
  group: Group;
  onStartMatching: () => void;
  onViewSettings: () => void;
  onViewMatches?: () => void;
}

export function GroupDashboard({
  group,
  onStartMatching,
  onViewSettings,
  onViewMatches,
}: GroupDashboardProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on Corner Of`,
          text: `Hey! Join our group "${group.name}" for ${group.vibe} in ${group.neighborhood}`,
          url: group.shareLink,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(group.shareLink);
      // In a real app, show a toast notification
      alert("Group link copied to clipboard!");
    }

    setIsSharing(false);
  };

  const memberCount = group.members.length + 1; // +1 for creator
  const mutualMatches = getMutualMatches(group.id);

  return (
    <div className="h-screen bg-background overflow-y-auto">
      <div className="max-w-sm mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{group.neighborhood}</span>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Group Details</h3>
            <Button variant="ghost" size="sm" onClick={onViewSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="text-sm font-medium text-black">
                {memberCount}/{group.groupSize}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vibe</span>
              <Badge variant="secondary" className="text-xs text-black">
                {group.vibe}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Looking for</span>
              <span className="text-sm font-medium text-black">
                {group.lookingFor}
              </span>
            </div>

            {mutualMatches.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Matches</span>
                <Badge
                  variant="default"
                  className="text-xs bg-accent text-accent-foreground"
                >
                  {mutualMatches.length} active
                </Badge>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Group Members</h3>

          <div className="space-y-3">
            {/* Creator */}
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  You
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">You</p>
                <p className="text-xs text-muted-foreground">Group creator</p>
              </div>
            </div>

            {/* Members */}
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={member.user.profilePhotoUrl || "/placeholder.svg"}
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {member.user.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {member.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: group.groupSize - memberCount }).map(
              (_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Waiting for member...
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </Card>

        <div className="space-y-3 pb-6">
          <Button
            onClick={onStartMatching}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black"
          >
            Discover Collaborations
          </Button>

          <Button
            onClick={onViewMatches}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground border-2 border-black"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {mutualMatches.length > 0
              ? `View Matches (${mutualMatches.length})`
              : "Open Group Chat"}
          </Button>

          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing}
            className="w-full bg-transparent"
          >
            <Share className="w-4 h-4 mr-2" />
            {isSharing ? "Sharing..." : "Share Group Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
