"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PhoneVerification } from "@/components/auth/phone-verification";
import { ProfileSetup } from "@/components/auth/profile-setup";
import { CreateGroup } from "@/components/groups/create-group";
import { JoinGroup } from "@/components/groups/join-group";
import { GroupDashboard } from "@/components/groups/group-dashboard";
import { MatchingInterface } from "@/components/matching/matching-interface";
import { MatchesList } from "@/components/chat/matches-list";
import { GroupChat } from "@/components/chat/group-chat";
import { useAuth } from "@/hooks/use-auth";
import { sendVerificationCode } from "@/lib/auth";
import { getCurrentUserGroup, type Group } from "@/lib/groups";
import { createVenueRecommendationMessage } from "@/lib/messages";
import type { GroupMatch } from "@/lib/matching";
import { Users, Plus } from "lucide-react";
import cornerOfLogo from "@/public/cornerof-logo.png";
import Image from "next/image";

type AuthStep = "phone" | "verification" | "profile" | "authenticated";
type GroupStep =
  | "choose"
  | "create"
  | "join"
  | "dashboard"
  | "matching"
  | "matches"
  | "chat";

export default function HomePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentStep, setCurrentStep] = useState<AuthStep>("phone");
  const [groupStep, setGroupStep] = useState<GroupStep>("choose");
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [currentMatch, setCurrentMatch] = useState<GroupMatch | null>(null);
  const [otherGroup, setOtherGroup] = useState<Group | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState("");

  // Check for existing group when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const userGroup = getCurrentUserGroup(user.id);
      if (userGroup) {
        setCurrentGroup(userGroup);
        setGroupStep("dashboard");
      }
    }
  }, [isAuthenticated, user]);

  const createMockGroupChat = () => {
    if (!currentGroup) return;

    // Create a mock match for the group chat
    const mockMatch: GroupMatch = {
      id: Number(`99999${currentGroup.id}`), // Ensure id is a number
      group1Id: currentGroup.id,
      group2Id: 9999,
      group1Liked: true,
      group2Liked: true,
      isMutualMatch: true,
      matchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Create a mock "other group" representing potential future members
    const mockOtherGroup: Group = {
      id: 9999,
      name: "Future Members",
      creatorId: 9999,
      groupSize: 4,
      neighborhood: currentGroup.neighborhood,
      vibe: currentGroup.vibe,
      lookingFor: currentGroup.lookingFor,
      shareLink: "corner-of://join/future",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [],
    };

    setCurrentMatch(mockMatch);
    setOtherGroup(mockOtherGroup);
    setGroupStep("chat");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-primary-foreground">
              CO
            </span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication flow
  if (!isAuthenticated) {
    const handleSendCode = async () => {
      if (!phoneNumber.trim()) {
        setError("Please enter your phone number");
        return;
      }

      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setError("Please enter a valid phone number");
        return;
      }

      setIsSigningUp(true);
      setError("");

      const result = await sendVerificationCode(phoneNumber);

      if (result.success) {
        setCurrentStep("verification");
      } else {
        setError(result.error || "Failed to send verification code");
      }

      setIsSigningUp(false);
    };

    if (currentStep === "verification") {
      return (
        <PhoneVerification
          phoneNumber={phoneNumber}
          onVerified={() => setCurrentStep("profile")}
          onBack={() => setCurrentStep("phone")}
        />
      );
    }

    if (currentStep === "profile") {
      return <ProfileSetup phoneNumber={phoneNumber} />;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center">
              <Image
                src={cornerOfLogo}
                alt="CornerOf Logo"
                width={64}
                height={64}
              />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Corner Of</h1>
            <p className="text-muted-foreground text-sm">
              Connect your crew with other groups for spontaneous meetups
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-bold text-black">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="chat-input"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button
              onClick={handleSendCode}
              disabled={!phoneNumber.trim() || isSigningUp}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black"
            >
              {isSigningUp ? "Sending Code..." : "Get Started"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              We'll send you a verification code to confirm your number
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Group management flow
  if (groupStep === "create") {
    return (
      <CreateGroup
        onGroupCreated={(group) => {
          setCurrentGroup(group);
          setGroupStep("dashboard");
        }}
        onBack={() => setGroupStep("choose")}
      />
    );
  }

  if (groupStep === "join") {
    return (
      <JoinGroup
        onGroupJoined={(group) => {
          setCurrentGroup(group);
          setGroupStep("dashboard");
        }}
        onBack={() => setGroupStep("choose")}
      />
    );
  }

  if (groupStep === "matching" && currentGroup) {
    return (
      <MatchingInterface
        currentGroup={currentGroup}
        onBack={() => setGroupStep("dashboard")}
        onMatchFound={async (match) => {
          setCurrentMatch(match);

          // Create initial venue recommendation message
          if (currentGroup) {
            const otherGroupData: Group = {
              id:
                match.group1Id === currentGroup.id
                  ? match.group2Id
                  : match.group1Id,
              name: "Matched Group",
              creatorId: 9999,
              groupSize: 4,
              neighborhood: "East Village",
              vibe: "Chill drinks",
              lookingFor: "Mixed group",
              shareLink: "corner-of://join/matched",
              isActive: true,
              createdAt: new Date().toISOString(),
              members: [],
            };

            await createVenueRecommendationMessage(
              match.id,
              currentGroup,
              otherGroupData
            );
          }

          setGroupStep("matches");
        }}
      />
    );
  }

  if (groupStep === "matches" && currentGroup) {
    return (
      <MatchesList
        currentGroup={currentGroup}
        onBack={() => setGroupStep("dashboard")}
        onSelectMatch={(match, otherGroupData) => {
          setCurrentMatch(match);
          setOtherGroup(otherGroupData);
          setGroupStep("chat");
        }}
        onOpenGroupChat={createMockGroupChat}
      />
    );
  }

  if (groupStep === "chat" && currentMatch && currentGroup && otherGroup) {
    return (
      <GroupChat
        match={currentMatch}
        currentGroup={currentGroup}
        otherGroup={otherGroup}
        onBack={() => setGroupStep("matches")}
      />
    );
  }

  if (groupStep === "dashboard" && currentGroup) {
    return (
      <GroupDashboard
        group={currentGroup}
        onStartMatching={() => setGroupStep("matching")}
        onViewSettings={() => {
          // TODO: Navigate to group settings
          console.log("View settings...");
        }}
        onViewMatches={() => {
          // Always navigate to matches list
          setGroupStep("matches");
        }}
      />
    );
  }

  // Group selection screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-foreground">
              CO
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Ready to connect with other groups?
          </p>
        </div>

        <div className="space-y-3">
          <Card className="p-6">
            <Button
              onClick={() => setGroupStep("create")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Group
            </Button>
          </Card>

          <Card className="p-6">
            <Button
              onClick={() => setGroupStep("join")}
              variant="outline"
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Existing Group
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
