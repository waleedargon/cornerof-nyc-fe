// Authentication utilities and types
export interface User {
  id: number
  phoneNumber: string
  name: string
  profilePhotoUrl?: string
  age?: number
  sex?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Mock verification for MVP - in production, use Twilio or similar
export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // For MVP, always return success
  console.log(`Verification code sent to ${phoneNumber}`)
  return { success: true }
}

export async function verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // For MVP, accept any 4-digit code
  if (code.length === 4) {
    return { success: true }
  }

  return { success: false, error: "Invalid verification code" }
}

export async function createUser(
  userData: Omit<User, "id" | "createdAt">,
): Promise<{ success: boolean; user?: User; error?: string }> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // For MVP, create mock user
  const user: User = {
    id: Math.floor(Math.random() * 10000),
    ...userData,
    createdAt: new Date().toISOString(),
  }

  // Store in localStorage for MVP
  localStorage.setItem("corner_of_user", JSON.stringify(user))

  return { success: true, user }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("corner_of_user")
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem("corner_of_user")
}
