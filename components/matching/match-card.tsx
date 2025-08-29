"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Users, Heart } from "lucide-react";
import type { MatchCandidate } from "@/lib/matching";

interface MatchCardProps {
  candidate: MatchCandidate;
  onLike: () => void;
  onPass: () => void;
}

export function MatchCard({ candidate, onLike, onPass }: MatchCardProps) {
  const { group, compatibilityScore, matchReasons } = candidate;
  const memberCount = group.members.length + 1; // +1 for creator

  return (
    <Card className="w-full max-w-sm mx-auto bg-card border-border overflow-hidden">
      {/* Group Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {group.name}
              </h3>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{group.neighborhood}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {memberCount} people
            </div>
            <div className="text-xs text-muted-foreground">
              {compatibilityScore}% match
            </div>
          </div>
        </div>

        {/* Vibe Badge */}
        <div className="mb-4">
          <Badge variant="secondary" className="text-xs">
            {group.vibe}
          </Badge>
        </div>

        {/* Match Reasons */}
        <div className="space-y-2 mb-4">
          {matchReasons.slice(0, 2).map((reason, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 text-sm text-muted-foreground"
            >
              <div className="w-1.5 h-1.5 bg-accent rounded-full" />
              <span>{reason}</span>
            </div>
          ))}
        </div>

        {/* Group Members Preview */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Group Members</h4>
          <div className="flex items-center space-x-2">
            {/* Creator */}
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {group.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Members */}
            {group.members.slice(0, 3).map((member) => (
              <Avatar key={member.id} className="w-8 h-8">
                <AvatarImage
                  src={member.user.profilePhotoUrl || "/placeholder.svg"}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {member.user.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}

            {/* Show count if more members */}
            {memberCount > 4 && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  +{memberCount - 4}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Looking For */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">Looking for</div>
          <div className="text-sm font-medium text-foreground">
            {group.lookingFor}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 pt-0 flex space-x-3">
        <button
          onClick={onPass}
          className="flex-1 py-3 px-4 rounded-full border border-border bg-background hover:bg-muted transition-colors"
        >
          <span className="text-sm font-medium text-muted-foreground">
            Skip
          </span>
        </button>
        <button
          onClick={onLike}
          className="flex-1 py-3 px-4 rounded-full bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2"
        >
          <Heart className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">
            Request Collaboration
          </span>
        </button>
      </div>
    </Card>
  );
}
