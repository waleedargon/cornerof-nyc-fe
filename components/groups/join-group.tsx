"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Users, Link } from "lucide-react"
import { joinGroupByPhone, joinGroupByLink } from "@/lib/groups"
import { useAuth } from "@/hooks/use-auth"

interface JoinGroupProps {
  onGroupJoined: (group: any) => void
  onBack: () => void
}

export function JoinGroup({ onGroupJoined, onBack }: JoinGroupProps) {
  const { user } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [shareLink, setShareLink] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")

  const handleJoinByPhone = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to join a group")
      return
    }

    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      return
    }

    setIsJoining(true)
    setError("")

    const result = await joinGroupByPhone(user.id, phoneNumber.trim())

    if (result.success && result.group) {
      onGroupJoined(result.group)
    } else {
      setError(result.error || "Failed to join group")
    }

    setIsJoining(false)
  }

  const handleJoinByLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError("You must be logged in to join a group")
      return
    }

    if (!shareLink.trim()) {
      setError("Please enter a group link")
      return
    }

    setIsJoining(true)
    setError("")

    const result = await joinGroupByLink(user.id, shareLink.trim())

    if (result.success && result.group) {
      onGroupJoined(result.group)
    } else {
      setError(result.error || "Failed to join group")
    }

    setIsJoining(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Join Group</h1>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="phone" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>By Phone</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center space-x-2">
                <Link className="w-4 h-4" />
                <span>By Link</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <form onSubmit={handleJoinByPhone} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Friend's Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="chat-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number of someone in the group you want to join
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={!phoneNumber.trim() || isJoining}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isJoining ? "Finding Group..." : "Find Group"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="link">
              <form onSubmit={handleJoinByLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link">Group Share Link</Label>
                  <Input
                    id="link"
                    type="text"
                    placeholder="corner-of://join/abc123"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                    className="chat-input"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Paste the group link shared by your friend</p>
                </div>

                <Button
                  type="submit"
                  disabled={!shareLink.trim() || isJoining}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isJoining ? "Joining Group..." : "Join Group"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive text-center mt-4">{error}</p>}
        </Card>
      </div>
    </div>
  )
}
