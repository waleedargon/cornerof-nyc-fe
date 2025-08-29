"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, MapPin, BarChart3, Settings, Plus, Eye, Edit, Trash2, TrendingUp, UserCheck, UserX } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import {
  isAdmin,
  getAdminStats,
  getAdminUsers,
  getAdminVenues,
  getRecentMatches,
  toggleUserStatus,
  type AdminUser,
  type AdminVenue,
  type AdminStats,
} from "@/lib/admin"

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [venues, setVenues] = useState<AdminVenue[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user.id)) {
      loadAdminData()
    }
  }, [isAuthenticated, user])

  const loadAdminData = async () => {
    setIsLoading(true)

    // Load all admin data
    const adminStats = getAdminStats()
    const adminUsers = getAdminUsers()
    const adminVenues = getAdminVenues()
    const recentMatches = getRecentMatches()

    setStats(adminStats)
    setUsers(adminUsers)
    setVenues(adminVenues)
    setMatches(recentMatches)
    setIsLoading(false)
  }

  const handleToggleUserStatus = async (userId: number) => {
    const result = await toggleUserStatus(userId)
    if (result.success) {
      // Refresh user data
      const updatedUsers = getAdminUsers()
      setUsers(updatedUsers)
    }
  }

  // Check if user is authenticated and is admin
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access the admin panel</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isAdmin(user.id)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin panel</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center animate-pulse">
            <Settings className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Corner Of Admin</h1>
              <p className="text-muted-foreground">Manage users, venues, and system settings</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Admin Panel
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
                    <p className="text-xs text-muted-foreground">Active Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.activeGroups}</p>
                    <p className="text-xs text-muted-foreground">Active Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.successfulMatches}</p>
                    <p className="text-xs text-muted-foreground">Successful Matches</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.activeVenues}</p>
                    <p className="text-xs text-muted-foreground">Active Venues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">User Management</h2>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-foreground">
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={user.isActive ? "default" : "secondary"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{user.groupCount} groups</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleUserStatus(user.id)}>
                          {user.isActive ? (
                            <UserX className="w-4 h-4 text-red-500" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Venues Tab */}
          <TabsContent value="venues" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Venue Management</h2>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Venue
              </Button>
            </div>

            <div className="grid gap-4">
              {venues.map((venue) => (
                <Card key={venue.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-foreground">{venue.name}</h3>
                          <Badge variant={venue.isActive ? "default" : "secondary"}>
                            {venue.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{venue.description}</p>
                        <div className="flex items-center space-x-1 mb-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{venue.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{venue.neighborhood}</Badge>
                          <Badge variant="outline">{venue.priceRange}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {venue.recommendationCount} recommendations
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Matches</h2>

            <div className="grid gap-4">
              {matches.map((match) => (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {match.group1Name} + {match.group2Name}
                        </h3>
                        <p className="text-sm text-muted-foreground">Match ID: {match.id}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={match.isMutualMatch ? "default" : "secondary"}>
                            {match.isMutualMatch ? "Mutual Match" : "Pending"}
                          </Badge>
                          {match.matchedAt && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(match.matchedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">System Analytics</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Match Success Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">
                      {stats ? Math.round((stats.successfulMatches / stats.totalMatches) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.successfulMatches} of {stats?.totalMatches} matches successful
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>User Engagement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-500">
                      {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.activeUsers} of {stats?.totalUsers} users active
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
