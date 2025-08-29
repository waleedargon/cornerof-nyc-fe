"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, MessageCircle } from "lucide-react";
import { MatchCard } from "./match-card";
import {
  findPotentialMatches,
  handleMatchAction,
  requestCollaboration,
  getStoredMatches,
  generateMockGroups,
  type MatchCandidate,
  type GroupMatch,
} from "@/lib/matching";
import type { Group } from "@/lib/groups";

interface MatchingInterfaceProps {
  currentGroup: Group;
  onBack: () => void;
  onMatchFound: (match: GroupMatch) => void;
}

export function MatchingInterface({
  currentGroup,
  onBack,
  onMatchFound,
}: MatchingInterfaceProps) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, [currentGroup.id]);

  const loadCandidates = async () => {
    setIsLoading(true);

    // Generate mock groups for demo
    const mockGroups = generateMockGroups();
    const existingMatches = getStoredMatches();

    // Find potential matches
    const potentialMatches = findPotentialMatches(
      currentGroup,
      mockGroups,
      existingMatches
    );

    setCandidates(potentialMatches);
    setCurrentIndex(0);
    setIsLoading(false);
  };

  const handleAction = async (action: "like" | "pass") => {
    if (currentIndex >= candidates.length || isProcessing) return;

    setIsProcessing(true);
    const currentCandidate = candidates[currentIndex];

    const result =
      action === "like"
        ? await requestCollaboration(currentGroup.id, currentCandidate.group.id)
        : await handleMatchAction(
            currentGroup.id,
            currentCandidate.group.id,
            action
          );

    if (result.success && result.match) {
      // Show match animation
      setShowMatchAnimation(true);
      setTimeout(() => {
        setShowMatchAnimation(false);
        if (result.match) onMatchFound(result.match);
      }, 2000);
    } else {
      // Move to next candidate
      setCurrentIndex((prev) => prev + 1);
    }

    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Finding Groups
            </h2>
            <p className="text-sm text-muted-foreground">
              Looking for compatible groups in your area...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showMatchAnimation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-accent rounded-full mx-auto flex items-center justify-center animate-bounce">
            <MessageCircle className="w-12 h-12 text-accent-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              It's a Match!
            </h2>
            <p className="text-muted-foreground">
              You can now chat with this group
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentIndex >= candidates.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">
              No More Groups
            </h1>
          </div>

          <Card className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-2xl mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                You've seen all available groups
              </h3>
              <p className="text-sm text-muted-foreground">
                Check back later for new groups, or invite more friends to join
                the platform!
              </p>
            </div>
            <Button
              onClick={loadCandidates}
              variant="outline"
              className="w-full bg-transparent"
            >
              Refresh
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              Suggested Collaborations
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} of {candidates.length}
            </p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Match Card */}
        <div className="flex justify-center">
          <MatchCard
            candidate={currentCandidate}
            onLike={() => handleAction("like")}
            onPass={() => handleAction("pass")}
          />
        </div>

        {/* Progress Indicator */}
        <div className="flex space-x-1 justify-center">
          {candidates.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={`h-1 w-8 rounded-full ${
                index === currentIndex
                  ? "bg-primary"
                  : index < currentIndex
                  ? "bg-accent"
                  : "bg-muted"
              }`}
            />
          ))}
          {candidates.length > 5 && (
            <div className="h-1 w-2 rounded-full bg-muted" />
          )}
        </div>
      </div>
    </div>
  );
}
