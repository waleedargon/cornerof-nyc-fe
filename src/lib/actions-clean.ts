'use server';

import { suggestVenue } from "@/ai/flows/suggest-venue";
import type { SuggestVenueInput, SuggestVenueOutput } from "@/ai/flows/suggest-venue";
import { matchGroups } from "@/ai/flows/match-groups";
import type { MatchGroupsInput, MatchGroupsOutput } from "@/ai/flows/match-groups";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, DocumentReference, getDoc, setDoc, serverTimestamp, addDoc, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { Group, User, GroupIntent } from "./types";

export async function getVenueSuggestion(input: SuggestVenueInput) {
  try {
    const result = await suggestVenue(input);
    return result;
  } catch (error) {
    console.error("Error getting venue suggestion:", error);
    return {
      venueSuggestion: "A local coffee shop",
      reasoning: "There was an issue with our suggestion service, but a local coffee shop is always a great, safe bet for a first meetup!",
    };
  }
}

export async function joinGroup(inviteCode: string, userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('inviteCode', '==', inviteCode.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: 'No group found with that invite code.' };
    }

    const groupDoc = querySnapshot.docs[0];
    const groupData = groupDoc.data();
    const userRef = doc(db, 'users', userId);

    // Check if user is already in a group
    const isMember = groupData.members.some((memberRef: DocumentReference) => memberRef.path === userRef.path);
    if (isMember) {
      return { success: true, message: 'You are already in this group.' };
    }
    
    // Check if group is full
    if (groupData.members.length >= groupData.size) {
      return { success: false, message: 'This group has already reached its maximum size.' };
    }

    // Add user to group
    await updateDoc(groupDoc.ref, {
        members: arrayUnion(userRef)
    });

    return { success: true, message: `You have successfully joined "${groupData.name}".` };
  } catch (error) {
    console.error("Error joining group:", error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}

// Helper function to calculate intent compatibility
function calculateIntentCompatibility(userIntent: GroupIntent, potentialIntent: GroupIntent): number {
  // Perfect matches
  if (userIntent === potentialIntent) return 10;
  
  // 'any' is compatible with everything
  if (userIntent === 'any' || potentialIntent === 'any') return 8;
  
  // 'mixed' is partially compatible with gender-specific groups
  if (userIntent === 'mixed' && (potentialIntent === 'all-boys' || potentialIntent === 'all-girls')) return 5;
  if (potentialIntent === 'mixed' && (userIntent === 'all-boys' || userIntent === 'all-girls')) return 5;
  
  // No compatibility between opposite gender-specific groups
  if ((userIntent === 'all-boys' && potentialIntent === 'all-girls') || 
      (userIntent === 'all-girls' && potentialIntent === 'all-boys')) return 0;
  
  return 0;
}

// Updated Matching Algorithm (fallback)
function calculateMatchScore(userGroup: any, potentialGroup: any): number {
    let score = 0;
    
    // Intent compatibility (highest priority - 40% of score)
    const intentScore = calculateIntentCompatibility(userGroup.intent as GroupIntent, potentialGroup.intent as GroupIntent);
    score += intentScore * 4; // Weight intent heavily
    
    // Neighborhood match (30% of score)
    if (userGroup.neighborhood.toLowerCase() === potentialGroup.neighborhood.toLowerCase()) {
      score += 30;
    } else {
      // Partial credit for similar neighborhoods (you could expand this logic)
      const userNeighborhood = userGroup.neighborhood.toLowerCase();
      const potentialNeighborhood = potentialGroup.neighborhood.toLowerCase();
      if (userNeighborhood.includes(potentialNeighborhood) || potentialNeighborhood.includes(userNeighborhood)) {
        score += 15;
      }
    }
    
    // Vibe compatibility (20% of score)
    const userVibes = userGroup.vibe.toLowerCase().split(/\s*,\s*|\s+/);
    const potentialVibes = potentialGroup.vibe.toLowerCase().split(/\s*,\s*|\s+/);
    const commonVibes = userVibes.filter(vibe => potentialVibes.includes(vibe));
    score += commonVibes.length * 5;
    
    // Size compatibility (10% of score)
    const sizeDifference = Math.abs(userGroup.size - potentialGroup.size);
    if (sizeDifference === 0) score += 10;
    else if (sizeDifference <= 1) score += 8;
    else if (sizeDifference <= 2) score += 5;
    else if (sizeDifference <= 3) score += 2;
    
    return score;
}

export async function findPotentialMatches(userGroupId: string): Promise<Group[]> {
  const userGroupRef = doc(db, "groups", userGroupId);
  const userGroupSnap = await getDoc(userGroupRef);
  if (!userGroupSnap.exists()) return [];

  const userGroupData = userGroupSnap.data() as any;
  
  // Check if user's group is open to matching
  if (!userGroupData.isOpenToMatch) {
    console.log('User group is not open to matching');
    return [];
  }

  // 🔑 sanitize current group
  const userGroup = {
    id: userGroupSnap.id,
    name: userGroupData.name || "",
    size: Number(userGroupData.size ?? 0),
    neighborhood: userGroupData.neighborhood || "",
    vibe: userGroupData.vibe || "",
    intent: userGroupData.intent as GroupIntent || "any",
  };

  // Get all groups that are open to matching (but map only primitive fields)
  const openGroupsQuery = query(
    collection(db, "groups"), 
    where("isOpenToMatch", "==", true)
  );
  const allGroupsSnap = await getDocs(openGroupsQuery);
  const allGroups = allGroupsSnap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: data.name || "",
      size: Number(data.size ?? 0),
      neighborhood: data.neighborhood || "",
      vibe: data.vibe || "",
      intent: data.intent as GroupIntent || "any",
    };
  });

  // Already swiped groups
  const swipesSnap = await getDocs(collection(db, "groups", userGroupId, "swipes"));
  const swipedIds = new Set(swipesSnap.docs.map((d) => d.id));

  // Already matched groups
  const matchesQ = query(collection(db, "matches"), where("groups", "array-contains", userGroupRef));
  const matchesSnap = await getDocs(matchesQ);

  const matchedGroupIds = new Set<string>();
  matchesSnap.forEach((matchDoc) => {
    const groups = matchDoc.data().groups as DocumentReference[];
    groups.forEach((groupRef) => {
      if (groupRef.id !== userGroupId) {
        matchedGroupIds.add(groupRef.id);
      }
    });
  });

  // Filter out current group, already swiped, and already matched groups
  const eligibleGroups = allGroups.filter((group) => 
    group.id !== userGroupId && 
    !swipedIds.has(group.id) && 
    !matchedGroupIds.has(group.id)
  );

  if (eligibleGroups.length === 0) return [];

  try {
    // Use AI to find and score matches
    const aiInput: MatchGroupsInput = {
      userGroup,
      potentialGroups: eligibleGroups,
    };

    const aiResult = await matchGroups(aiInput);
    
    // Convert AI results back to full Group objects with scores
    const matchedGroups: Group[] = [];
    
    for (const match of aiResult.matches) {
      if (match.compatibilityScore >= 30) { // Only include groups with decent compatibility
        const fullGroupData = allGroupsSnap.docs.find(doc => doc.id === match.groupId)?.data();
        if (fullGroupData) {
          const fullGroup: Group = {
            id: match.groupId,
            name: fullGroupData.name || "",
            size: Number(fullGroupData.size ?? 0),
            neighborhood: fullGroupData.neighborhood || "",
            vibe: fullGroupData.vibe || "",
            intent: fullGroupData.intent as GroupIntent || "any",
            isOpenToMatch: fullGroupData.isOpenToMatch || false,
            pictureUrl: fullGroupData.pictureUrl,
            members: fullGroupData.members || [],
            creator: fullGroupData.creator || { id: "", name: "", avatarUrl: "" },
            // Add AI scoring data for UI display
            compatibilityScore: match.compatibilityScore,
            matchReasoning: match.reasoning,
          };
          matchedGroups.push(fullGroup);
        }
      }
    }
    
    return matchedGroups;
    
  } catch (error) {
    console.error('Error in AI matching, falling back to basic algorithm:', error);
    
    // Fallback to basic scoring if AI fails
    const scoredGroups = eligibleGroups.map((group) => ({
      group,
      score: calculateMatchScore(userGroup, group),
    }));

    // Sort by score and return top matches
    scoredGroups.sort((a, b) => b.score - a.score);
    
    return scoredGroups
      .filter(sg => sg.score >= 30) // Only include decent matches
      .slice(0, 10) // Limit to top 10 matches
      .map(sg => {
        const fullGroupData = allGroupsSnap.docs.find(doc => doc.id === sg.group.id)?.data();
        if (fullGroupData) {
          return {
            id: sg.group.id,
            name: fullGroupData.name || "",
            size: Number(fullGroupData.size ?? 0),
            neighborhood: fullGroupData.neighborhood || "",
            vibe: fullGroupData.vibe || "",
            intent: fullGroupData.intent as GroupIntent || "any",
            isOpenToMatch: fullGroupData.isOpenToMatch || false,
            pictureUrl: fullGroupData.pictureUrl,
            members: fullGroupData.members || [],
            creator: fullGroupData.creator || { id: "", name: "", avatarUrl: "" },
            compatibilityScore: sg.score,
            matchReasoning: "Basic compatibility assessment",
          } as Group;
        }
        return null;
      })
      .filter(Boolean) as Group[];
  }
}

// Keep the old function for backward compatibility, but make it use the new one
export async function findPotentialMatch(userGroupId: string): Promise<Group | null> {
  const matches = await findPotentialMatches(userGroupId);
  return matches.length > 0 ? matches[0] : null;
}

export async function handleMatchDecision(
    userGroupId: string,
    targetGroupId: string,
    decision: 'yes' | 'no'
): Promise<{ status: 'liked' | 'rejected' | 'match_created' | 'error', message: string }> {
    try {
        const userGroupRef = doc(db, 'groups', userGroupId);
        const targetGroupRef = doc(db, 'groups', targetGroupId);

        // Record the swipe decision to prevent seeing this group again
        await setDoc(doc(db, 'groups', userGroupId, 'swipes', targetGroupId), { decision, swipedAt: serverTimestamp() });

        if (decision === 'no') {
            // Also record a swipe for the other group so they don't see this group either
            await setDoc(doc(db, 'groups', targetGroupId, 'swipes', userGroupId), { decision: 'rejected_by_other', swipedAt: serverTimestamp() });
            return { status: 'rejected', message: 'Group rejected.' };
        }

        // Decision is 'yes', so record the like in the target group's "likes" subcollection
        await setDoc(doc(db, 'groups', targetGroupId, 'likes', userGroupId), { likedAt: serverTimestamp() });

        // Check for a mutual like (if the user group has a "like" from the target group)
        const mutualLikeDoc = await getDoc(doc(db, 'groups', userGroupId, 'likes', targetGroupId));

        if (mutualLikeDoc.exists()) {
            // Mutual like! Create a match if one doesn't already exist.
            const matchesRef = collection(db, 'matches');
            
            // A more robust check to find if a match exists between these two groups
            const q1 = query(matchesRef, where('groups', '==', [userGroupRef, targetGroupRef]));
            const q2 = query(matchesRef, where('groups', '==', [targetGroupRef, userGroupRef]));

            const [existingMatch1, existingMatch2] = await Promise.all([
                getDocs(q1),
                getDocs(q2),
            ]);

            if (existingMatch1.empty && existingMatch2.empty) {
                 // Fetch the target group's details for the venue suggestion
                const targetGroupSnap = await getDoc(targetGroupRef);
                if (targetGroupSnap.exists()) {
                    const targetGroupData = targetGroupSnap.data() as Group;
                    const suggestion = await suggestVenue({
                        neighborhoods: targetGroupData.neighborhoods || (targetGroupData.neighborhood ? [targetGroupData.neighborhood] : []),
                        vibes: targetGroupData.vibes || (targetGroupData.vibe ? [targetGroupData.vibe] : []),
                        groupIntent: targetGroupData.intent,
                    });

                    await addDoc(matchesRef, {
                        groups: [userGroupRef, targetGroupRef],
                        createdAt: serverTimestamp(),
                        venueSuggestion: suggestion.venueSuggestion,
                        venueReasoning: suggestion.reasoning,
                    });
                } else {
                     // Fallback if target group data can't be fetched
                    await addDoc(matchesRef, {
                        groups: [userGroupRef, targetGroupRef],
                        createdAt: serverTimestamp(),
                    });
                }
                return { status: 'match_created', message: 'It\'s a match!' };
            }
        }

        return { status: 'liked', message: 'Like recorded. Waiting for the other group.' };

    } catch (error) {
        console.error('Error handling match decision:', error);
        return { status: 'error', message: 'An error occurred.' };
    }
}

export async function leaveGroup(groupId: string, userId: string): Promise<{ success: boolean; message: string; groupDeleted?: boolean }> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const userRef = doc(db, 'users', userId);
    
    // Get current group data
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) {
      return { success: false, message: 'Group not found.' };
    }
    
    const groupData = groupSnap.data();
    const currentMembers = groupData.members || [];
    
    // Remove user from members array
    const updatedMembers = currentMembers.filter((memberRef: DocumentReference) => 
      memberRef.path !== userRef.path
    );
    
    // If no members left, delete the group and all related data
    if (updatedMembers.length === 0) {
      // Delete the group document
      await updateDoc(groupRef, { members: [] }); // Clear members first
      
      // Get all subcollections and delete them
      const swipesQuery = query(collection(db, 'groups', groupId, 'swipes'));
      const swipesSnap = await getDocs(swipesQuery);
      const swipeDeletes = swipesSnap.docs.map(doc => doc.ref.delete());
      
      const likesQuery = query(collection(db, 'groups', groupId, 'likes'));
      const likesSnap = await getDocs(likesQuery);
      const likeDeletes = likesSnap.docs.map(doc => doc.ref.delete());
      
      // Delete all related invitations
      const sentInvitationsQuery = query(
        collection(db, 'invitations'),
        where('fromGroup', '==', groupRef)
      );
      const receivedInvitationsQuery = query(
        collection(db, 'invitations'),
        where('toGroup', '==', groupRef)
      );
      
      const [sentInvitationsSnap, receivedInvitationsSnap] = await Promise.all([
        getDocs(sentInvitationsQuery),
        getDocs(receivedInvitationsQuery)
      ]);
      
      const invitationDeletes = [
        ...sentInvitationsSnap.docs.map(doc => doc.ref.delete()),
        ...receivedInvitationsSnap.docs.map(doc => doc.ref.delete())
      ];
      
      // Execute all deletions
      await Promise.all([...swipeDeletes, ...likeDeletes, ...invitationDeletes]);
      
      // Finally delete the group document
      await groupRef.delete();
      
      return { 
        success: true, 
        message: 'You left the group. Since it was empty, the group has been deleted.', 
        groupDeleted: true 
      };
    } else {
      // Update group with remaining members
      await updateDoc(groupRef, {
        members: updatedMembers
      });
      
      return { 
        success: true, 
        message: 'You have successfully left the group.' 
      };
    }
    
  } catch (error) {
    console.error('Error leaving group:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}
