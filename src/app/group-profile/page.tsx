'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Group, User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Crown, Users as UsersIcon, MapPin, Tag, Heart } from 'lucide-react';
import Image from 'next/image';

export default function GroupProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Group Profile - Auth state:', { user: !!user, authLoading });
    
    const fetchUserGroup = async () => {
      if (!user) {
        return; // Don't redirect immediately, let auth hook handle it
      }

      try {
        const userRef = doc(db, 'users', user.id);
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', userRef)
        );

        const groupSnapshot = await getDocs(groupsQuery);
        
        if (groupSnapshot.empty) {
          console.log('User has no group, redirecting to home');
          // User has no group, redirect to home
          router.push('/home');
          return;
        }

        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data() as Group;
        
        // Fetch member details
        const memberPromises = groupData.members.map(async (memberRef) => {
          if (memberRef instanceof DocumentReference) {
            const memberDoc = await getDoc(memberRef);
            return { id: memberDoc.id, ...memberDoc.data() } as User;
          }
          return memberRef as User;
        });

        // Fetch creator details
        let creator: User;
        if (groupData.creator instanceof DocumentReference) {
          const creatorDoc = await getDoc(groupData.creator);
          creator = { id: creatorDoc.id, ...creatorDoc.data() } as User;
        } else {
          creator = groupData.creator as User;
        }

        const members = await Promise.all(memberPromises);

        setGroup({
          ...groupData,
          id: groupDoc.id,
          members,
          creator,
        });
        console.log('Group data loaded successfully');
      } catch (error) {
        console.error('Error fetching group:', error);
        router.push('/home');
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      // User is not authenticated after auth loading is complete
      console.log('User not authenticated, redirecting to signin');
      router.push('/signin');
      return;
    }

    // User is authenticated, fetch group data
    console.log('User authenticated, fetching group data');
    fetchUserGroup();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-64 bg-muted"></div>
          <div className="p-6 space-y-4">
            <div className="h-6 bg-muted rounded"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <UsersIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Group Found</h2>
          <p className="text-muted-foreground">You're not part of any group yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Large Group Photo Header */}
      <div className="relative h-64 w-full overflow-hidden">
        {group.pictureUrl ? (
          <Image
            src={group.pictureUrl}
            alt={group.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <UsersIcon className="h-20 w-20 text-primary/40" />
          </div>
        )}
        
        {/* Overlay with visibility and mode */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-black/40 text-white border-white/20">
                {group.isOpenToMatch ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hidden
                  </>
                )}
              </Badge>
            </div>
            <Badge variant="secondary" className="bg-black/40 text-white border-white/20">
              {group.mode === 'dictator' ? (
                <>
                  <Crown className="h-3 w-3 mr-1" />
                  Shot Caller
                </>
              ) : (
                <>
                  <UsersIcon className="h-3 w-3 mr-1" />
                  Majority Rules
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Group Name */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Members List */}
      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Members</h2>
        <div className="space-y-3">
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center space-x-4">
              <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-primary/10">
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-primary font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.name}
                  </p>
                  {group.creator.id === member.id && (
                    <Crown className="h-4 w-4 text-amber-500" />
                  )}
                  {user?.id === member.id && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                {member.age && (
                  <p className="text-xs text-muted-foreground">
                    {member.age} years old
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Details */}
      <div className="px-6 space-y-4">
        {/* Neighborhoods */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Neighborhoods</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.neighborhoods?.map((neighborhood) => (
                <Badge key={neighborhood} variant="secondary">
                  {neighborhood}
                </Badge>
              )) || (group.neighborhood && (
                <Badge variant="secondary">{group.neighborhood}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vibes */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Vibes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.vibes?.map((vibe) => (
                <Badge key={vibe} variant="secondary">
                  {vibe}
                </Badge>
              )) || (group.vibe && (
                <Badge variant="secondary">{group.vibe}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intent */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Group Intent</h3>
            </div>
            <Badge variant="outline">
              {group.intent === 'all-boys' && 'All Guys'}
              {group.intent === 'all-girls' && 'All Girls'}
              {group.intent === 'mixed' && 'Mixed (Guys & Girls)'}
              {group.intent === 'any' && 'Any (Open to All)'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
