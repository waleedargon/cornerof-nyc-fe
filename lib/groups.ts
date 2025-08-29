// Group management utilities and types
export interface Group {
  id: number;
  name: string;
  creatorId: number;
  groupSize: number;
  neighborhood: string;
  vibe: string;
  lookingFor: string;
  shareLink: string;
  isActive: boolean;
  createdAt: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  joinedAt: string;
  user: {
    id: number;
    name: string;
    profilePhotoUrl?: string;
  };
}

export interface CreateGroupData {
  name: string;
  groupSize: number;
  neighborhood: string;
  vibe: string;
  lookingFor: string;
}

// Mock group operations for MVP
export async function createGroup(
  creatorId: number,
  groupData: CreateGroupData
): Promise<{ success: boolean; group?: Group; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Enforce single active group membership: creator cannot already be in an active group
  const existingActiveGroup = getCurrentUserGroup(creatorId);
  if (existingActiveGroup) {
    return { success: false, error: "You are already part of an active group" };
  }

  const shareLink = `corner-of://join/${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  const group: Group = {
    id: Math.floor(Math.random() * 10000),
    creatorId,
    ...groupData,
    shareLink,
    isActive: true,
    createdAt: new Date().toISOString(),
    members: [],
  };

  // Store in localStorage for MVP
  const existingGroups = getStoredGroups();
  existingGroups.push(group);
  localStorage.setItem("corner_of_groups", JSON.stringify(existingGroups));

  return { success: true, group };
}

export async function joinGroupByPhone(
  userId: number,
  phoneNumber: string
): Promise<{ success: boolean; group?: Group; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Enforce single active group membership
  const existingActiveGroup = getCurrentUserGroup(userId);
  if (existingActiveGroup) {
    return { success: false, error: "You can join only one group at a time" };
  }

  // For MVP, simulate finding a group by phone
  const groups = getStoredGroups();
  const group = groups.find(
    (g) => g.isActive && g.members.length < g.groupSize
  );

  if (!group) {
    return {
      success: false,
      error: "No active groups found for this phone number",
    };
  }

  // Add user to group
  const member: GroupMember = {
    id: Math.floor(Math.random() * 10000),
    groupId: group.id,
    userId,
    joinedAt: new Date().toISOString(),
    user: {
      id: userId,
      name: "Friend", // In real app, fetch from user data
      profilePhotoUrl: undefined,
    },
  };

  group.members.push(member);

  // Update stored groups
  const updatedGroups = groups.map((g) => (g.id === group.id ? group : g));
  localStorage.setItem("corner_of_groups", JSON.stringify(updatedGroups));

  return { success: true, group };
}

export async function joinGroupByLink(
  userId: number,
  shareLink: string
): Promise<{ success: boolean; group?: Group; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Enforce single active group membership
  const existingActiveGroup = getCurrentUserGroup(userId);
  if (existingActiveGroup) {
    return { success: false, error: "You can join only one group at a time" };
  }

  const groups = getStoredGroups();
  const group = groups.find((g) => g.shareLink === shareLink && g.isActive);

  if (!group) {
    return { success: false, error: "Invalid or expired group link" };
  }

  if (group.members.length >= group.groupSize) {
    return { success: false, error: "Group is full" };
  }

  // Add user to group
  const member: GroupMember = {
    id: Math.floor(Math.random() * 10000),
    groupId: group.id,
    userId,
    joinedAt: new Date().toISOString(),
    user: {
      id: userId,
      name: "New Member", // In real app, fetch from user data
      profilePhotoUrl: undefined,
    },
  };

  group.members.push(member);

  // Update stored groups
  const updatedGroups = groups.map((g) => (g.id === group.id ? group : g));
  localStorage.setItem("corner_of_groups", JSON.stringify(updatedGroups));

  return { success: true, group };
}

export function getUserGroups(userId: number): Group[] {
  const groups = getStoredGroups();
  return groups.filter(
    (group) =>
      group.creatorId === userId ||
      group.members.some((member) => member.userId === userId)
  );
}

export function getCurrentUserGroup(userId: number): Group | null {
  const userGroups = getUserGroups(userId);
  return userGroups.find((group) => group.isActive) || null;
}

export function getGroupById(groupId: number): Group | null {
  const groups = getStoredGroups();
  return groups.find((g) => g.id === groupId) || null;
}

function saveGroups(groups: Group[]): void {
  localStorage.setItem("corner_of_groups", JSON.stringify(groups));
}

export async function leaveGroup(
  userId: number
): Promise<{ success: boolean; group?: Group | null; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const groups = getStoredGroups();
  let updatedGroup: Group | null = null;

  const updatedGroups = groups.map((g) => {
    const isCreator = g.creatorId === userId;
    const isMember = g.members.some((m) => m.userId === userId);
    if (!isCreator && !isMember) return g;

    if (isCreator) {
      // For MVP: if creator leaves, deactivate the group
      updatedGroup = { ...g, isActive: false, members: [...g.members] };
      return updatedGroup;
    }

    // Remove member
    const newMembers = g.members.filter((m) => m.userId !== userId);
    updatedGroup = { ...g, members: newMembers };
    return updatedGroup;
  });

  if (!updatedGroup) {
    return { success: false, error: "User is not in any active group" };
  }

  saveGroups(updatedGroups);
  return { success: true, group: updatedGroup };
}

export async function removeMember(
  groupId: number,
  targetUserId: number,
  actingUserId: number
): Promise<{ success: boolean; group?: Group; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const groups = getStoredGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { success: false, error: "Group not found" };
  if (group.creatorId !== actingUserId)
    return {
      success: false,
      error: "Only the group creator can remove members",
    };
  if (!group.members.some((m) => m.userId === targetUserId))
    return { success: false, error: "Member not found" };

  const updated: Group = {
    ...group,
    members: group.members.filter((m) => m.userId !== targetUserId),
  };
  const updatedGroups = groups.map((g) => (g.id === groupId ? updated : g));
  saveGroups(updatedGroups);
  return { success: true, group: updated };
}

function getStoredGroups(): Group[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem("corner_of_groups");
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export const NEIGHBORHOODS = [
  "SoHo",
  "East Village",
  "West Village",
  "Lower East Side",
  "Tribeca",
  "Chelsea",
  "Meatpacking District",
  "Williamsburg",
  "Bushwick",
  "DUMBO",
  "Park Slope",
  "Brooklyn Heights",
  "Long Island City",
  "Astoria",
];

export const VIBES = [
  "Chill drinks",
  "Party mode",
  "Rooftop vibes",
  "Dancing",
  "Live music",
  "Craft cocktails",
  "Wine bar",
  "Sports bar",
  "Karaoke",
  "Late night",
];

export const LOOKING_FOR_OPTIONS = [
  "2-3 people",
  "4-5 people",
  "6+ people",
  "Mixed group",
  "Similar vibe",
  "Any group",
  "Party crew",
  "Chill group",
];
