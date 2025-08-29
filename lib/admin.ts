// Admin utilities and types
import type { Group } from "./groups"
import type { GroupMatch } from "./matching"

export interface AdminUser {
  id: number
  name: string
  phoneNumber: string
  profilePhotoUrl?: string
  createdAt: string
  isActive: boolean
  groupCount: number
}

export interface AdminVenue {
  id: number
  name: string
  address: string
  description: string
  neighborhood: string
  vibes: string[]
  priceRange: string
  bestFor: string
  isActive: boolean
  createdAt: string
  recommendationCount: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalGroups: number
  activeGroups: number
  totalMatches: number
  successfulMatches: number
  totalVenues: number
  activeVenues: number
}

// Check if user is admin (mock implementation)
export function isAdmin(userId: number): boolean {
  // In real app, this would check against admin user list
  return userId === 1 // Mock: user ID 1 is admin
}

// Get admin statistics
export function getAdminStats(): AdminStats {
  if (typeof window === "undefined") {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalGroups: 0,
      activeGroups: 0,
      totalMatches: 0,
      successfulMatches: 0,
      totalVenues: 0,
      activeVenues: 0,
    }
  }

  // Get data from localStorage (in real app, this would be API calls)
  const groups = JSON.parse(localStorage.getItem("corner_of_groups") || "[]")
  const matches = JSON.parse(localStorage.getItem("corner_of_matches") || "[]")
  const venues = getAdminVenues()

  return {
    totalUsers: 25, // Mock data
    activeUsers: 18,
    totalGroups: groups.length,
    activeGroups: groups.filter((g: Group) => g.isActive).length,
    totalMatches: matches.length,
    successfulMatches: matches.filter((m: GroupMatch) => m.isMutualMatch).length,
    totalVenues: venues.length,
    activeVenues: venues.filter((v) => v.isActive).length,
  }
}

// Get all users for admin view
export function getAdminUsers(): AdminUser[] {
  // Mock user data - in real app, this would be an API call
  return [
    {
      id: 1,
      name: "Admin User",
      phoneNumber: "+1 (555) 123-4567",
      createdAt: "2024-01-15T10:00:00Z",
      isActive: true,
      groupCount: 0,
    },
    {
      id: 2,
      name: "Sarah Johnson",
      phoneNumber: "+1 (555) 234-5678",
      createdAt: "2024-01-16T14:30:00Z",
      isActive: true,
      groupCount: 1,
    },
    {
      id: 3,
      name: "Mike Chen",
      phoneNumber: "+1 (555) 345-6789",
      createdAt: "2024-01-17T09:15:00Z",
      isActive: true,
      groupCount: 1,
    },
    {
      id: 4,
      name: "Emma Davis",
      phoneNumber: "+1 (555) 456-7890",
      createdAt: "2024-01-18T16:45:00Z",
      isActive: false,
      groupCount: 0,
    },
  ]
}

// Get all venues for admin management
export function getAdminVenues(): AdminVenue[] {
  const venues: AdminVenue[] = [
    {
      id: 1,
      name: "The Rooftop at 1 Hotel Brooklyn Bridge",
      address: "1 Hotel Brooklyn Bridge, Brooklyn, NY",
      description: "Stunning Manhattan skyline views with craft cocktails",
      neighborhood: "Brooklyn Heights",
      vibes: ["rooftop", "upscale", "views", "cocktails"],
      priceRange: "$$$",
      bestFor: "sunset drinks",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      recommendationCount: 15,
    },
    {
      id: 2,
      name: "Please Don't Tell (PDT)",
      address: "113 St Marks Pl, New York, NY",
      description: "Hidden speakeasy behind a phone booth with craft cocktails",
      neighborhood: "East Village",
      vibes: ["speakeasy", "cocktails", "intimate", "craft"],
      priceRange: "$$$",
      bestFor: "late night drinks",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      recommendationCount: 23,
    },
    {
      id: 3,
      name: "House of Yes",
      address: "2 Wyckoff Ave, Brooklyn, NY",
      description: "Immersive nightlife experience with performances and dancing",
      neighborhood: "Bushwick",
      vibes: ["party", "dancing", "creative", "unique"],
      priceRange: "$$",
      bestFor: "wild night out",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      recommendationCount: 8,
    },
  ]

  return venues
}

// Add new venue
export async function addVenue(
  venueData: Omit<AdminVenue, "id" | "createdAt" | "recommendationCount">,
): Promise<{ success: boolean; venue?: AdminVenue; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

  const newVenue: AdminVenue = {
    ...venueData,
    id: Math.floor(Math.random() * 10000),
    createdAt: new Date().toISOString(),
    recommendationCount: 0,
  }

  // In real app, this would save to database
  console.log("Adding venue:", newVenue)

  return { success: true, venue: newVenue }
}

// Update venue
export async function updateVenue(
  venueId: number,
  updates: Partial<AdminVenue>,
): Promise<{ success: boolean; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

  // In real app, this would update in database
  console.log("Updating venue:", venueId, updates)

  return { success: true }
}

// Delete venue
export async function deleteVenue(venueId: number): Promise<{ success: boolean; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

  // In real app, this would delete from database
  console.log("Deleting venue:", venueId)

  return { success: true }
}

// Toggle user active status
export async function toggleUserStatus(userId: number): Promise<{ success: boolean; error?: string }> {
  await new Promise((resolve) => setTimeout(resolve, 300)) // Simulate API delay

  // In real app, this would update user status in database
  console.log("Toggling user status:", userId)

  return { success: true }
}

// Get recent matches for admin view
export function getRecentMatches(): Array<GroupMatch & { group1Name: string; group2Name: string }> {
  if (typeof window === "undefined") return []

  const matches = JSON.parse(localStorage.getItem("corner_of_matches") || "[]")
  const groups = JSON.parse(localStorage.getItem("corner_of_groups") || "[]")

  return matches.map((match: GroupMatch) => {
    const group1 = groups.find((g: Group) => g.id === match.group1Id)
    const group2 = groups.find((g: Group) => g.id === match.group2Id)

    return {
      ...match,
      group1Name: group1?.name || "Unknown Group",
      group2Name: group2?.name || "Unknown Group",
    }
  })
}
