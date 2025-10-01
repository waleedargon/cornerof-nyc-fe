import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Tent, MapPin, Tag, MessageSquare } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCounts() {
    const usersPromise = getDocs(collection(db, 'users'));
    const groupsPromise = getDocs(collection(db, 'groups'));
    const venuesPromise = getDocs(collection(db, 'venues'));
    const neighborhoodsPromise = getDocs(collection(db, 'neighborhoods'));
    const vibesPromise = getDocs(collection(db, 'vibes'));
    const matchesPromise = getDocs(collection(db, 'matches'));

    const [usersSnapshot, groupsSnapshot, venuesSnapshot, neighborhoodsSnapshot, vibesSnapshot, matchesSnapshot] = await Promise.all([
        usersPromise,
        groupsPromise,
        venuesPromise,
        neighborhoodsPromise,
        vibesPromise,
        matchesPromise
    ]);

    return {
        users: usersSnapshot.size,
        groups: groupsSnapshot.size,
        venues: venuesSnapshot.size,
        neighborhoods: neighborhoodsSnapshot.size,
        vibes: vibesSnapshot.size,
        activeChatrooms: matchesSnapshot.size
    };
}


export default async function AdminDashboard() {
  const counts = await getCounts();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      <Link href="/admin/groups" className="transition-transform hover:scale-105">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.groups}</div>
            <p className="text-xs text-muted-foreground">
              Active groups on the platform
            </p>
          </CardContent>
        </Card>
      </Link>
      
      <Link href="/admin/users" className="transition-transform hover:scale-105">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.users}</div>
            <p className="text-xs text-muted-foreground">
              Users looking for matches
            </p>
          </CardContent>
        </Card>
      </Link>
      
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Chatrooms</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.activeChatrooms}</div>
          <p className="text-xs text-muted-foreground">
            Groups currently matched and chatting
          </p>
        </CardContent>
      </Card>
      
      <Link href="/admin/venues" className="transition-transform hover:scale-105">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Venues</CardTitle>
            <Tent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.venues}</div>
            <p className="text-xs text-muted-foreground">
              Venues in suggestion database
            </p>
          </CardContent>
        </Card>
      </Link>
      
      <Link href="/admin/neighborhoods" className="transition-transform hover:scale-105">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neighborhoods</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.neighborhoods}</div>
            <p className="text-xs text-muted-foreground">
              Available neighborhood options
            </p>
          </CardContent>
        </Card>
      </Link>
      
      <Link href="/admin/vibes" className="transition-transform hover:scale-105">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vibes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.vibes}</div>
            <p className="text-xs text-muted-foreground">
              Available vibe options
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
