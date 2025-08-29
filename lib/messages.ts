// Message management utilities and types
import type { Group } from "./groups";

export interface Message {
  id: string;
  matchId: number;
  senderId: number;
  senderName: string;
  senderGroupId: number;
  messageText: string;
  messageType: "text" | "venue_suggestion" | "system";
  timestamp: Date;
  venueData?: {
    name: string;
    address: string;
    description: string;
    neighborhood: string;
    priceRange: string;
    bestFor: string;
  };
}

export interface ChatParticipant {
  id: number;
  name: string;
  profilePhotoUrl?: string;
  groupId: number;
  groupName: string;
}

function getBannedKey(matchId: number) {
  return `corner_of_banned_${matchId}`;
}

export function getBannedParticipants(matchId: number): number[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getBannedKey(matchId));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function banParticipant(matchId: number, userId: number): void {
  const banned = new Set(getBannedParticipants(matchId));
  banned.add(userId);
  localStorage.setItem(
    getBannedKey(matchId),
    JSON.stringify(Array.from(banned))
  );
}

export function unbanParticipant(matchId: number, userId: number): void {
  const banned = new Set(getBannedParticipants(matchId));
  banned.delete(userId);
  localStorage.setItem(
    getBannedKey(matchId),
    JSON.stringify(Array.from(banned))
  );
}

// Get messages for a match
export function getMatchMessages(matchId: number): Message[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(`corner_of_messages_${matchId}`);
  if (!stored) return [];

  try {
    const messages = JSON.parse(stored);
    return messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch {
    return [];
  }
}

// Send a message
export async function sendMessage(
  matchId: number,
  senderId: number,
  senderName: string,
  senderGroupId: number,
  messageText: string
): Promise<{ success: boolean; message?: Message; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network delay

  const message: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    matchId,
    senderId,
    senderName,
    senderGroupId,
    messageText: messageText.trim(),
    messageType: "text",
    timestamp: new Date(),
  };

  // Get existing messages
  const existingMessages = getMatchMessages(matchId);
  const updatedMessages = [...existingMessages, message];

  // Store messages
  localStorage.setItem(
    `corner_of_messages_${matchId}`,
    JSON.stringify(updatedMessages)
  );

  return { success: true, message };
}

// Create initial venue recommendation message
export async function createVenueRecommendationMessage(
  matchId: number,
  group1: Group,
  group2: Group
): Promise<Message> {
  // Get venue recommendation based on groups' preferences
  const venue = getVenueRecommendation(group1, group2);

  const message: Message = {
    id: `venue_${Date.now()}`,
    matchId,
    senderId: 0, // System message
    senderName: "Corner Of",
    senderGroupId: 0,
    messageText: `Perfect match! Here's a great spot for you both to meet up: ${venue.name}`,
    messageType: "venue_suggestion",
    timestamp: new Date(),
    venueData: venue,
  };

  // Store as first message
  const existingMessages = getMatchMessages(matchId);
  const updatedMessages = [message, ...existingMessages];
  localStorage.setItem(
    `corner_of_messages_${matchId}`,
    JSON.stringify(updatedMessages)
  );

  return message;
}

// Get venue recommendation based on group preferences
function getVenueRecommendation(group1: Group, group2: Group) {
  // Use the neighborhood from either group (prefer group1)
  const neighborhood = group1.neighborhood || group2.neighborhood;

  // Combine vibes to find best match
  const combinedVibes = `${group1.vibe} ${group2.vibe}`.toLowerCase();

  const venues = [
    {
      name: "The Rooftop at 1 Hotel Brooklyn Bridge",
      address: "1 Hotel Brooklyn Bridge, Brooklyn, NY",
      description: "Stunning Manhattan skyline views with craft cocktails",
      neighborhood: "Brooklyn Heights",
      vibes: ["rooftop", "upscale", "views", "cocktails"],
      priceRange: "$$$",
      bestFor: "sunset drinks",
    },
    {
      name: "Please Don't Tell (PDT)",
      address: "113 St Marks Pl, New York, NY",
      description: "Hidden speakeasy behind a phone booth with craft cocktails",
      neighborhood: "East Village",
      vibes: ["speakeasy", "cocktails", "intimate", "craft"],
      priceRange: "$$$",
      bestFor: "late night drinks",
    },
    {
      name: "The Standard High Line",
      address: "848 Washington St, New York, NY",
      description: "Trendy rooftop with Hudson River views and dancing",
      neighborhood: "Meatpacking District",
      vibes: ["trendy", "rooftop", "dancing", "upscale"],
      priceRange: "$$$",
      bestFor: "party vibes",
    },
    {
      name: "Beauty & Essex",
      address: "146 Essex St, New York, NY",
      description: "Upscale restaurant and bar perfect for group dining",
      neighborhood: "Lower East Side",
      vibes: ["dinner", "cocktails", "upscale", "group"],
      priceRange: "$$$",
      bestFor: "dinner and drinks",
    },
    {
      name: "Westlight",
      address: "111 N 12th St, Brooklyn, NY",
      description: "Rooftop bar with panoramic city views",
      neighborhood: "Williamsburg",
      vibes: ["rooftop", "cocktails", "views", "trendy"],
      priceRange: "$$",
      bestFor: "group hangout",
    },
    {
      name: "House of Yes",
      address: "2 Wyckoff Ave, Brooklyn, NY",
      description:
        "Immersive nightlife experience with performances and dancing",
      neighborhood: "Bushwick",
      vibes: ["party", "dancing", "creative", "unique"],
      priceRange: "$$",
      bestFor: "wild night out",
    },
    {
      name: "The Dead Rabbit",
      address: "30 Water St, New York, NY",
      description: "Award-winning cocktail bar with Irish pub vibes",
      neighborhood: "Financial District",
      vibes: ["cocktails", "historic", "craft", "intimate"],
      priceRange: "$$$",
      bestFor: "craft cocktails",
    },
    {
      name: "Smorgasburg",
      address: "90 Kent Ave, Brooklyn, NY",
      description: "Food market with diverse vendors and waterfront views",
      neighborhood: "Williamsburg",
      vibes: ["food", "casual", "outdoor", "diverse"],
      priceRange: "$",
      bestFor: "casual meetup",
    },
    {
      name: "The High Line",
      address: "New York, NY 10011",
      description: "Elevated park perfect for walking and casual conversation",
      neighborhood: "Chelsea",
      vibes: ["outdoor", "casual", "walking", "scenic"],
      priceRange: "Free",
      bestFor: "daytime hangout",
    },
    {
      name: "Brooklyn Bowl",
      address: "61 Wythe Ave, Brooklyn, NY",
      description: "Bowling, live music, and food in a fun atmosphere",
      neighborhood: "Williamsburg",
      vibes: ["bowling", "music", "casual", "group"],
      priceRange: "$$",
      bestFor: "group activity",
    },
    {
      name: "Pier 17 Rooftop",
      address: "89 South St, New York, NY",
      description: "Outdoor rooftop with harbor views and live events",
      neighborhood: "Financial District",
      vibes: ["rooftop", "outdoor", "views", "events"],
      priceRange: "$$",
      bestFor: "outdoor vibes",
    },
    {
      name: "The Jane Hotel Rooftop",
      address: "113 Jane St, New York, NY",
      description: "Historic hotel rooftop with intimate setting",
      neighborhood: "West Village",
      vibes: ["rooftop", "intimate", "historic", "cocktails"],
      priceRange: "$$$",
      bestFor: "intimate gathering",
    },
  ];

  let bestVenue = null;
  let highestScore = 0;

  for (const venue of venues) {
    let score = 0;

    // Neighborhood match (highest priority)
    if (venue.neighborhood === neighborhood) {
      score += 50;
    }

    // Vibe matching
    const vibeMatches = venue.vibes.filter((vibe) =>
      combinedVibes.includes(vibe)
    );
    score += vibeMatches.length * 15;

    // Group size consideration
    const totalGroupSize = group1.groupSize + group2.groupSize;
    if (venue.vibes.includes("group") && totalGroupSize >= 6) {
      score += 20;
    }
    if (venue.vibes.includes("intimate") && totalGroupSize <= 4) {
      score += 20;
    }

    // Time-based recommendations (mock - in real app would use actual time)
    const hour = new Date().getHours();
    if (hour >= 17 && venue.vibes.includes("rooftop")) {
      score += 10; // Evening rooftop bonus
    }
    if (hour >= 22 && venue.vibes.includes("party")) {
      score += 15; // Late night party bonus
    }
    if (hour <= 16 && venue.vibes.includes("outdoor")) {
      score += 10; // Daytime outdoor bonus
    }

    if (score > highestScore) {
      highestScore = score;
      bestVenue = venue;
    }
  }

  // Default to first venue if no good match
  if (!bestVenue) {
    bestVenue = venues[0];
  }

  return {
    name: bestVenue.name,
    address: bestVenue.address,
    description: bestVenue.description,
    neighborhood: bestVenue.neighborhood,
    priceRange: bestVenue.priceRange,
    bestFor: bestVenue.bestFor,
  };
}

// Get chat participants from both groups
export function getChatParticipants(
  group1: Group,
  group2: Group
): ChatParticipant[] {
  const participants: ChatParticipant[] = [];

  // Add group1 creator and members
  participants.push({
    id: group1.creatorId,
    name: "Group Creator", // In real app, fetch from user data
    groupId: group1.id,
    groupName: group1.name,
  });

  group1.members.forEach((member) => {
    participants.push({
      id: member.userId,
      name: member.user.name,
      profilePhotoUrl: member.user.profilePhotoUrl,
      groupId: group1.id,
      groupName: group1.name,
    });
  });

  // Add group2 creator and members
  participants.push({
    id: group2.creatorId,
    name: "Other Group Creator", // In real app, fetch from user data
    groupId: group2.id,
    groupName: group2.name,
  });

  group2.members.forEach((member) => {
    participants.push({
      id: member.userId,
      name: member.user.name,
      profilePhotoUrl: member.user.profilePhotoUrl,
      groupId: group2.id,
      groupName: group2.name,
    });
  });

  return participants;
}

// Simulate receiving messages from other participants
export function simulateIncomingMessage(
  matchId: number,
  participants: ChatParticipant[],
  currentUserId: number
): void {
  // Don't simulate if no other participants
  const otherParticipants = participants.filter((p) => p.id !== currentUserId);
  if (otherParticipants.length === 0) return;

  // Random chance to receive a message
  if (Math.random() > 0.3) return;

  const randomParticipant =
    otherParticipants[Math.floor(Math.random() * otherParticipants.length)];

  const sampleMessages = [
    "Hey! This place looks amazing 🔥",
    "What time works for everyone?",
    "I'm so excited to meet you all!",
    "Should we make a reservation?",
    "This is going to be fun!",
    "Perfect choice for tonight!",
    "Count us in! 🙌",
    "Love the vibe of this place",
  ];

  const randomMessage =
    sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

  // Simulate delay then add message
  setTimeout(() => {
    sendMessage(
      matchId,
      randomParticipant.id,
      randomParticipant.name,
      randomParticipant.groupId,
      randomMessage
    );
  }, Math.random() * 5000 + 2000); // 2-7 seconds delay
}

export async function suggestAlternativeVenue(
  matchId: number,
  group1: Group,
  group2: Group,
  senderId: number,
  senderName: string,
  senderGroupId: number
): Promise<{ success: boolean; message?: Message; error?: string }> {
  // Get a different venue recommendation
  const venue = getAlternativeVenueRecommendation(group1, group2);

  const message: Message = {
    id: `alt_venue_${Date.now()}`,
    matchId,
    senderId,
    senderName,
    senderGroupId,
    messageText: `How about this alternative? ${venue.name} - ${venue.bestFor}`,
    messageType: "venue_suggestion",
    timestamp: new Date(),
    venueData: venue,
  };

  // Get existing messages and add new suggestion
  const existingMessages = getMatchMessages(matchId);
  const updatedMessages = [...existingMessages, message];
  localStorage.setItem(
    `corner_of_messages_${matchId}`,
    JSON.stringify(updatedMessages)
  );

  return { success: true, message };
}

function getAlternativeVenueRecommendation(group1: Group, group2: Group) {
  // Get existing venue suggestions to avoid duplicates
  const existingMessages = getMatchMessages(1); // This would need the actual matchId
  const suggestedVenues = existingMessages
    .filter((msg) => msg.messageType === "venue_suggestion" && msg.venueData)
    .map((msg) => msg.venueData?.name);

  // Use the same logic as getVenueRecommendation but exclude already suggested venues
  const neighborhood = group1.neighborhood || group2.neighborhood;
  const combinedVibes = `${group1.vibe} ${group2.vibe}`.toLowerCase();

  const venues = [
    // Same venue list as above - in real app, this would be shared
    {
      name: "The Rooftop at 1 Hotel Brooklyn Bridge",
      address: "1 Hotel Brooklyn Bridge, Brooklyn, NY",
      description: "Stunning Manhattan skyline views with craft cocktails",
      neighborhood: "Brooklyn Heights",
      vibes: ["rooftop", "upscale", "views", "cocktails"],
      priceRange: "$$$",
      bestFor: "sunset drinks",
    },
    // ... other venues would be here
  ];

  // Filter out already suggested venues
  const availableVenues = venues.filter(
    (venue) => !suggestedVenues.includes(venue.name)
  );

  // Use same scoring logic but from available venues
  let bestVenue = availableVenues.find(
    (venue) => venue.neighborhood === neighborhood
  );

  if (!bestVenue) {
    bestVenue = availableVenues.find((venue) =>
      venue.vibes.some((vibe) => combinedVibes.includes(vibe))
    );
  }

  if (!bestVenue && availableVenues.length > 0) {
    bestVenue = availableVenues[0];
  }

  // Fallback to any venue if all have been suggested
  if (!bestVenue) {
    bestVenue = venues[Math.floor(Math.random() * venues.length)];
  }

  return {
    name: bestVenue.name,
    address: bestVenue.address,
    description: bestVenue.description,
    neighborhood: bestVenue.neighborhood,
    priceRange: bestVenue.priceRange,
    bestFor: bestVenue.bestFor,
  };
}
