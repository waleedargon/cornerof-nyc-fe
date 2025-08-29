// Matching logic and utilities
import type { Group } from "./groups";

export interface MatchCandidate {
  group: Group;
  compatibilityScore: number;
  matchReasons: string[];
}

export interface GroupMatch {
  id: number;
  group1Id: number;
  group2Id: number;
  group1Liked: boolean;
  group2Liked: boolean;
  isMutualMatch: boolean;
  matchedAt?: string;
  createdAt: string;
}

// Calculate compatibility score between two groups
export function calculateCompatibility(group1: Group, group2: Group): number {
  let score = 0;
  const reasons: string[] = [];

  // Size compatibility (prefer similar sizes)
  const sizeDiff = Math.abs(group1.groupSize - group2.groupSize);
  if (sizeDiff === 0) {
    score += 30;
    reasons.push("Same group size");
  } else if (sizeDiff <= 1) {
    score += 20;
    reasons.push("Similar group size");
  } else if (sizeDiff <= 2) {
    score += 10;
  }

  // Neighborhood match (same area gets bonus)
  if (group1.neighborhood === group2.neighborhood) {
    score += 25;
    reasons.push("Same neighborhood");
  }

  // Vibe compatibility
  const vibeKeywords1 = group1.vibe.toLowerCase().split(" ");
  const vibeKeywords2 = group2.vibe.toLowerCase().split(" ");
  const commonVibes = vibeKeywords1.filter((vibe) =>
    vibeKeywords2.includes(vibe)
  );

  if (commonVibes.length > 0) {
    score += commonVibes.length * 15;
    reasons.push("Similar vibe");
  }

  // Looking for compatibility
  const lookingFor1 = group1.lookingFor.toLowerCase();
  const lookingFor2 = group2.lookingFor.toLowerCase();

  // Check if groups are looking for each other's characteristics
  if (lookingFor1.includes("mixed") || lookingFor2.includes("mixed")) {
    score += 10;
    reasons.push("Open to mixed groups");
  }

  if (lookingFor1.includes("any") || lookingFor2.includes("any")) {
    score += 15;
    reasons.push("Open to any group");
  }

  if (lookingFor1.includes("similar") && lookingFor2.includes("similar")) {
    score += 20;
    reasons.push("Both want similar vibes");
  }

  // Size preference matching
  const group1Size = group1.groupSize;
  const group2Size = group2.groupSize;

  if (
    lookingFor1.includes(`${group2Size}`) ||
    lookingFor2.includes(`${group1Size}`)
  ) {
    score += 25;
    reasons.push("Size preference match");
  }

  return Math.min(score, 100); // Cap at 100
}

// Find potential matches for a group
export function findPotentialMatches(
  currentGroup: Group,
  allGroups: Group[],
  existingMatches: GroupMatch[]
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  // Get groups that haven't been matched with yet
  const matchedGroupIds = existingMatches
    .filter(
      (match) =>
        match.group1Id === currentGroup.id || match.group2Id === currentGroup.id
    )
    .map((match) =>
      match.group1Id === currentGroup.id ? match.group2Id : match.group1Id
    );

  const availableGroups = allGroups.filter((group) => {
    if (group.id === currentGroup.id) return false;
    if (!group.isActive) return false;
    if (matchedGroupIds.includes(group.id)) return false;
    if (group.members.length < 1) return false;
    // Restrict to same neighborhood and overlapping vibe keywords
    const sameNeighborhood = group.neighborhood === currentGroup.neighborhood;
    const vibeTokensA = currentGroup.vibe.toLowerCase().split(" ");
    const vibeTokensB = group.vibe.toLowerCase().split(" ");
    const hasVibeOverlap = vibeTokensA.some((v) => vibeTokensB.includes(v));
    if (!sameNeighborhood) return false;
    if (!hasVibeOverlap) return false;
    return true;
  });

  for (const group of availableGroups) {
    const compatibilityScore = calculateCompatibility(currentGroup, group);

    // Only include groups with reasonable compatibility (>= 20)
    if (compatibilityScore >= 20) {
      const matchReasons: string[] = [];

      // Generate match reasons for display
      if (currentGroup.neighborhood === group.neighborhood) {
        matchReasons.push(`Both in ${group.neighborhood}`);
      }

      if (
        currentGroup.vibe.toLowerCase().includes(group.vibe.toLowerCase()) ||
        group.vibe.toLowerCase().includes(currentGroup.vibe.toLowerCase())
      ) {
        matchReasons.push(`Similar vibe: ${group.vibe}`);
      }

      if (Math.abs(currentGroup.groupSize - group.groupSize) <= 1) {
        matchReasons.push(`${group.groupSize} people like you`);
      }

      candidates.push({
        group,
        compatibilityScore,
        matchReasons:
          matchReasons.length > 0
            ? matchReasons
            : [`${group.groupSize} people in ${group.neighborhood}`],
      });
    }
  }

  // Sort by compatibility score (highest first)
  return candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

// Handle like/pass action
export async function handleMatchAction(
  currentGroupId: number,
  targetGroupId: number,
  action: "like" | "pass"
): Promise<{
  success: boolean;
  match?: GroupMatch;
  isMutualMatch?: boolean;
  error?: string;
}> {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

  const existingMatches = getStoredMatches();

  // Check if there's already a match record
  let existingMatch = existingMatches.find(
    (match) =>
      (match.group1Id === currentGroupId && match.group2Id === targetGroupId) ||
      (match.group1Id === targetGroupId && match.group2Id === currentGroupId)
  );

  if (!existingMatch) {
    // Create new match record
    existingMatch = {
      id: Math.floor(Math.random() * 10000),
      group1Id: currentGroupId,
      group2Id: targetGroupId,
      group1Liked: action === "like",
      group2Liked: false,
      isMutualMatch: false,
      createdAt: new Date().toISOString(),
    };
    existingMatches.push(existingMatch);
  } else {
    // Update existing match
    if (existingMatch.group1Id === currentGroupId) {
      existingMatch.group1Liked = action === "like";
    } else {
      existingMatch.group2Liked = action === "like";
    }
  }

  // Check for mutual match
  if (existingMatch.group1Liked && existingMatch.group2Liked) {
    existingMatch.isMutualMatch = true;
    existingMatch.matchedAt = new Date().toISOString();
  }

  // Save updated matches
  localStorage.setItem("corner_of_matches", JSON.stringify(existingMatches));

  return {
    success: true,
    match: existingMatch,
    isMutualMatch: existingMatch.isMutualMatch,
  };
}

// Collaboration request: wrapper over like/pass semantics
export async function requestCollaboration(
  requesterGroupId: number,
  targetGroupId: number
): Promise<{ success: boolean; match?: GroupMatch; error?: string }> {
  // Static demo: auto-accept to create mutual match immediately
  const first = await handleMatchAction(
    requesterGroupId,
    targetGroupId,
    "like"
  );
  await handleMatchAction(targetGroupId, requesterGroupId, "like");
  // Reload the stored matches to return the updated record
  const matches = getStoredMatches();
  const updated = matches.find(
    (m) =>
      (m.group1Id === requesterGroupId && m.group2Id === targetGroupId) ||
      (m.group1Id === targetGroupId && m.group2Id === requesterGroupId)
  );
  return { success: true, match: updated };
}

// Accept collaboration: target group accepts a pending request
export async function acceptCollaboration(
  targetGroupId: number,
  requesterGroupId: number
): Promise<{
  success: boolean;
  match?: GroupMatch;
  isMutual?: boolean;
  error?: string;
}> {
  const result = await handleMatchAction(
    targetGroupId,
    requesterGroupId,
    "like"
  );
  return {
    success: result.success,
    match: result.match,
    isMutual: result.isMutualMatch,
  };
}

// Get pending collaboration requests for a group (requests sent TO this group)
export function getPendingCollaborationRequests(groupId: number): GroupMatch[] {
  const matches = getStoredMatches();
  return matches.filter((m) => {
    const isTarget = m.group2Id === groupId || m.group1Id === groupId;
    if (!isTarget) return false;
    // Determine which side is this group and whether the other side has liked already
    if (m.group1Id === groupId) {
      // Other side (group2) liked, waiting for this group (group1) to accept
      return m.group2Liked && !m.group1Liked && !m.isMutualMatch;
    } else {
      // Other side (group1) liked, waiting for this group (group2) to accept
      return m.group1Liked && !m.group2Liked && !m.isMutualMatch;
    }
  });
}

// Get stored matches
export function getStoredMatches(): GroupMatch[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem("corner_of_matches");
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Get mutual matches for a group
export function getMutualMatches(groupId: number): GroupMatch[] {
  const matches = getStoredMatches();
  return matches.filter(
    (match) =>
      match.isMutualMatch &&
      (match.group1Id === groupId || match.group2Id === groupId)
  );
}

// Generate mock groups for testing
export function generateMockGroups(): Group[] {
  const mockGroups: Group[] = [
    {
      id: 1001,
      name: "The Night Owls",
      creatorId: 2001,
      groupSize: 4,
      neighborhood: "SoHo",
      vibe: "Party mode",
      lookingFor: "4-5 people",
      shareLink: "corner-of://join/night1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3001,
          groupId: 1001,
          userId: 2002,
          joinedAt: new Date().toISOString(),
          user: { id: 2002, name: "Sarah", profilePhotoUrl: undefined },
        },
        {
          id: 3002,
          groupId: 1001,
          userId: 2003,
          joinedAt: new Date().toISOString(),
          user: { id: 2003, name: "Mike", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1002,
      name: "Rooftop Crew",
      creatorId: 2004,
      groupSize: 3,
      neighborhood: "SoHo",
      vibe: "Rooftop vibes",
      lookingFor: "Similar vibe",
      shareLink: "corner-of://join/roof1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3003,
          groupId: 1002,
          userId: 2005,
          joinedAt: new Date().toISOString(),
          user: { id: 2005, name: "Emma", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1003,
      name: "Chill Vibes Only",
      creatorId: 2006,
      groupSize: 5,
      neighborhood: "East Village",
      vibe: "Chill drinks",
      lookingFor: "Mixed group",
      shareLink: "corner-of://join/chill1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3004,
          groupId: 1003,
          userId: 2007,
          joinedAt: new Date().toISOString(),
          user: { id: 2007, name: "Alex", profilePhotoUrl: undefined },
        },
        {
          id: 3005,
          groupId: 1003,
          userId: 2008,
          joinedAt: new Date().toISOString(),
          user: { id: 2008, name: "Jordan", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1004,
      name: "SoHo Sundowners",
      creatorId: 2010,
      groupSize: 3,
      neighborhood: "SoHo",
      vibe: "Chill drinks",
      lookingFor: "2-3 people",
      shareLink: "corner-of://join/soho2",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3010,
          groupId: 1004,
          userId: 2011,
          joinedAt: new Date().toISOString(),
          user: { id: 2011, name: "Nina", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1005,
      name: "East Village Groovers",
      creatorId: 2012,
      groupSize: 4,
      neighborhood: "East Village",
      vibe: "Party mode",
      lookingFor: "Similar vibe",
      shareLink: "corner-of://join/ev1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3011,
          groupId: 1005,
          userId: 2013,
          joinedAt: new Date().toISOString(),
          user: { id: 2013, name: "Luis", profilePhotoUrl: undefined },
        },
        {
          id: 3012,
          groupId: 1005,
          userId: 2014,
          joinedAt: new Date().toISOString(),
          user: { id: 2014, name: "Priya", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1006,
      name: "Williamsburg Rooftoppers",
      creatorId: 2015,
      groupSize: 5,
      neighborhood: "Williamsburg",
      vibe: "Rooftop vibes",
      lookingFor: "6+ people",
      shareLink: "corner-of://join/wb1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3013,
          groupId: 1006,
          userId: 2016,
          joinedAt: new Date().toISOString(),
          user: { id: 2016, name: "Chen", profilePhotoUrl: undefined },
        },
        {
          id: 3014,
          groupId: 1006,
          userId: 2017,
          joinedAt: new Date().toISOString(),
          user: { id: 2017, name: "Ivy", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1007,
      name: "LES Wine & Dine",
      creatorId: 2018,
      groupSize: 2,
      neighborhood: "Lower East Side",
      vibe: "Craft cocktails",
      lookingFor: "Mixed group",
      shareLink: "corner-of://join/les1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3015,
          groupId: 1007,
          userId: 2019,
          joinedAt: new Date().toISOString(),
          user: { id: 2019, name: "Omar", profilePhotoUrl: undefined },
        },
      ],
    },
    {
      id: 1008,
      name: "Bushwick Nightbirds",
      creatorId: 2020,
      groupSize: 4,
      neighborhood: "Bushwick",
      vibe: "Dancing",
      lookingFor: "Party crew",
      shareLink: "corner-of://join/bw1",
      isActive: true,
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 3016,
          groupId: 1008,
          userId: 2021,
          joinedAt: new Date().toISOString(),
          user: { id: 2021, name: "Riley", profilePhotoUrl: undefined },
        },
      ],
    },
  ];

  // Store mock groups if none exist
  const existingGroups = localStorage.getItem("corner_of_groups");
  if (!existingGroups || JSON.parse(existingGroups).length === 0) {
    localStorage.setItem("corner_of_groups", JSON.stringify(mockGroups));
  }

  return mockGroups;
}
