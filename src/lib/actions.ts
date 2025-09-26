'use server';

import { suggestVenue } from "@/ai/flows/suggest-venue";
import type { SuggestVenueInput, SuggestVenueOutput } from "@/ai/flows/suggest-venue";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, DocumentReference, getDoc, setDoc, serverTimestamp, addDoc, limit, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Group, User, GroupIntent, Vote, Invitation, Report } from "./types";
import { getVenueSuggestionForMatch } from '@/lib/venue-service';

// Simple in-memory cache for performance
const matchCache = new Map<string, { matches: Group[]; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Clear cache when groups are updated
function clearMatchCache(groupId?: string) {
  if (groupId) {
    matchCache.delete(groupId);
  } else {
    matchCache.clear();
  }
}

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

    // Check if user is already in this specific group
    const isMember = groupData.members.some((memberRef: DocumentReference) => memberRef.path === userRef.path);
    if (isMember) {
      return { success: true, message: 'You are already in this group.' };
    }

    // Check if user is already in ANY OTHER group (1 group restriction)
    const allGroupsQuery = query(groupsRef);
    const allGroupsSnapshot = await getDocs(allGroupsQuery);
    
    for (const groupDocSnapshot of allGroupsSnapshot.docs) {
      // Skip the current group we're trying to join
      if (groupDocSnapshot.id === groupDoc.id) {
        continue;
      }
      
      const existingGroupData = groupDocSnapshot.data();
      const isUserInGroup = existingGroupData.members.some((memberRef: DocumentReference) => memberRef.path === userRef.path);
      if (isUserInGroup) {
        return { 
          success: false, 
          message: 'You are already in a group. You need to leave your current group before joining another one.' 
        };
      }
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

// Robust, fast matching algorithm
function calculateRobustMatchScore(userGroup: any, potentialGroup: any): number {
    // Safety checks to prevent infinite loops
    if (!userGroup || !potentialGroup) return 0;
    if (userGroup.id === potentialGroup.id) return 0;
    
    try {
        // First check strict intent compatibility - if not compatible, return 0
        const intentCompatible = isStrictIntentCompatible(userGroup.intent, potentialGroup.intent);
        if (!intentCompatible) {
          return 0; // Hard filter - incompatible groups get 0 score
        }
        
    let score = 0;
        
        // Intent compatibility (40% of score) - already checked above
        const intentScore = calculateIntentCompatibility(userGroup.intent as GroupIntent, potentialGroup.intent as GroupIntent);
        score += Math.min(intentScore * 4, 40);
        
        // Neighborhood match (30% of score)
        const neighborhoodScore = calculateNeighborhoodScore(userGroup.neighborhood || '', potentialGroup.neighborhood || '');
        score += Math.min(neighborhoodScore, 30);
        
        // Vibe compatibility (20% of score)
        const vibeScore = calculateVibeScore(userGroup.vibe || '', potentialGroup.vibe || '');
        score += Math.min(vibeScore, 20);
        
        // Size compatibility (10% of score)
        const sizeScore = calculateSizeScore(userGroup.size || 0, potentialGroup.size || 0);
        score += Math.min(sizeScore, 10);
        
        return Math.min(Math.max(score, 0), 100);
    } catch (error) {
        console.error('Error in calculateRobustMatchScore:', error);
        return 0;
    }
}

// Fast intent compatibility check
function isStrictIntentCompatible(userIntent: GroupIntent, potentialIntent: GroupIntent): boolean {
    // Perfect matches
    if (userIntent === potentialIntent) return true;
    
    // 'any' is compatible with everything
    if (userIntent === 'any' || potentialIntent === 'any') return true;
    
    // 'mixed' is compatible with gender-specific groups
    if (userIntent === 'mixed' || potentialIntent === 'mixed') return true;
    
    // Hard block: all-boys and all-girls are never compatible
    if ((userIntent === 'all-boys' && potentialIntent === 'all-girls') || 
        (userIntent === 'all-girls' && potentialIntent === 'all-boys')) {
        return false;
    }
    
    return true;
}

// Optimized scoring functions
function calculateNeighborhoodScore(userNeighborhood: string, potentialNeighborhood: string): number {
    if (!userNeighborhood || !potentialNeighborhood) return 0;
    
    const userLower = userNeighborhood.toLowerCase().trim();
    const potentialLower = potentialNeighborhood.toLowerCase().trim();
    
    // Exact match
    if (userLower === potentialLower) return 30;
    
    // Substring match
    if (userLower.includes(potentialLower) || potentialLower.includes(userLower)) return 15;
    
    // Simple word matching (safer)
    const userWords = userLower.split(/\s+/).slice(0, 3); // Limit to prevent loops
    const potentialWords = potentialLower.split(/\s+/).slice(0, 3);
    
    for (const userWord of userWords) {
        if (userWord.length >= 3) {
            for (const potentialWord of potentialWords) {
                if (potentialWord.length >= 3 && userWord.startsWith(potentialWord.substring(0, 3))) {
                    return 10;
                }
            }
        }
    }
    
    return 0;
}

function calculateVibeScore(userVibe: string, potentialVibe: string): number {
    if (!userVibe || !potentialVibe) return 0;
    
    const userLower = userVibe.toLowerCase().trim();
    const potentialLower = potentialVibe.toLowerCase().trim();
    
    // Simple exact match
    if (userLower === potentialLower) return 20;
    
    // Simple substring match
    if (userLower.includes(potentialLower) || potentialLower.includes(userLower)) return 15;
    
    // Word-based matching (safer)
    const userWords = userLower.split(/[\s,]+/).filter(w => w.length > 2);
    const potentialWords = potentialLower.split(/[\s,]+/).filter(w => w.length > 2);
    
    let matches = 0;
    for (const userWord of userWords.slice(0, 5)) { // Limit to prevent loops
        for (const potentialWord of potentialWords.slice(0, 5)) {
            if (userWord === potentialWord) {
                matches++;
                break; // Only count each user word once
            }
        }
    }
    
    return Math.min(matches * 5, 20);
}

function calculateSizeScore(userSize: number, potentialSize: number): number {
    const sizeDifference = Math.abs(userSize - potentialSize);
    if (sizeDifference === 0) return 10;
    if (sizeDifference <= 1) return 8;
    if (sizeDifference <= 2) return 5;
    if (sizeDifference <= 3) return 2;
    return 0;
}

function generateMatchReasoning(userGroup: any, potentialGroup: any, score: number): string {
    if (score >= 80) return "Excellent match: high compatibility across all factors";
    if (score >= 60) return "Great match: strong compatibility in key areas";
    if (score >= 40) return "Good match: solid compatibility";
    if (score >= 20) return "Fair match: some compatibility";
    return "Basic match: minimal compatibility";
}

// Legacy function for backward compatibility
function calculateMatchScore(userGroup: any, potentialGroup: any): number {
    return calculateRobustMatchScore(userGroup, potentialGroup);
}

export async function findPotentialMatches(userGroupId: string): Promise<Group[]> {
  console.time('findPotentialMatches');
  
  // Check cache first
  const cached = matchCache.get(userGroupId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('Returning cached matches');
    console.timeEnd('findPotentialMatches');
    return cached.matches;
  }
  
  // Add timeout to prevent infinite processing
  const timeoutPromise = new Promise<Group[]>((_, reject) => {
    setTimeout(() => reject(new Error('Matching timeout')), 10000); // 10 second timeout
  });
  
  const matchingPromise = async (): Promise<Group[]> => {
  try {
  const userGroupRef = doc(db, "groups", userGroupId);
  const userGroupSnap = await getDoc(userGroupRef);
    if (!userGroupSnap.exists()) {
      console.timeEnd('findPotentialMatches');
      return [];
    }

  const userGroupData = userGroupSnap.data() as any;

    // Check if user's group is open to matching
    if (!userGroupData.isOpenToMatch) {
      console.log('User group is not open to matching');
      console.timeEnd('findPotentialMatches');
      return [];
    }

    // Check if user's group already has an active match
    if (userGroupData.hasActiveMatch) {
      console.log('User group already has an active match');
      console.timeEnd('findPotentialMatches');
      return [];
    }

    // Sanitize current group
    const userGroup = {
    id: userGroupSnap.id,
    name: userGroupData.name || "",
    size: Number(userGroupData.size ?? 0),
    neighborhood: userGroupData.neighborhood || "",
    vibe: userGroupData.vibe || "",
      intent: userGroupData.intent as GroupIntent || "any",
    };

            // Get all groups that are open to matching (filter active matches in code)
            const [allGroupsSnap, swipesSnap, matchesSnap] = await Promise.all([
              getDocs(query(collection(db, "groups"), 
                where("isOpenToMatch", "==", true)
              )),
              getDocs(collection(db, "groups", userGroupId, "swipes")),
              getDocs(query(collection(db, "matches"), where("groups", "array-contains", userGroupRef)))
            ]);

    // Process swipes and matches
  const swipedIds = new Set(swipesSnap.docs.map((d) => d.id));
  const matchedGroupIds = new Set<string>();

  matchesSnap.forEach((matchDoc) => {
    const groups = matchDoc.data().groups as DocumentReference[];
    groups.forEach((groupRef) => {
      if (groupRef.id !== userGroupId) {
        matchedGroupIds.add(groupRef.id);
      }
    });
  });

    // Process and score groups efficiently
    const scoredGroups: Array<{ group: any; score: number; fullData: any }> = [];
    let processedCount = 0;
    const maxGroups = 50; // Limit to prevent infinite processing
    
    allGroupsSnap.docs.forEach((groupDoc) => {
      if (processedCount >= maxGroups) return; // Safety limit
      
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;
      
      // Skip if current group, already swiped, already matched, or has active match
      if (groupId === userGroupId || swipedIds.has(groupId) || matchedGroupIds.has(groupId) || groupData.hasActiveMatch) {
        return;
      }

      try {
        const potentialGroup = {
          id: groupId,
          name: groupData.name || "",
          size: Number(groupData.size ?? 0) || 0,
          neighborhood: groupData.neighborhood || "",
          vibe: groupData.vibe || "",
          intent: (groupData.intent as GroupIntent) || "any",
        };

        // Fast algorithmic scoring with strict intent filtering
        const score = calculateRobustMatchScore(userGroup, potentialGroup);
        
        
        if (score >= 30) { // Only include decent matches
          scoredGroups.push({
            group: potentialGroup,
            score,
            fullData: groupData
          });
        }
        
        processedCount++;
      } catch (error) {
        console.error('Error processing group:', groupId, error);
      }
    });

    // Sort by score (highest first) and limit results
    scoredGroups.sort((a, b) => b.score - a.score);
    const topMatches = scoredGroups.slice(0, 10);

    // Convert to full Group objects with safe serialization
    const matchedGroups: Group[] = [];
    
    for (const { group, score, fullData } of topMatches) {
      try {
        // Safely process members array
        let safeMembers: any[] = [];
        if (Array.isArray(fullData.members)) {
          const memberPromises = fullData.members.map(async (member: any) => {
            if (member && typeof member === 'object') {
              // If it's a DocumentReference, resolve it
              if (member.id && member.path) {
                try {
                  const memberDoc = await getDoc(member);
                  if (memberDoc.exists()) {
                    const memberData = memberDoc.data();
                    return {
                      id: memberDoc.id,
                      name: memberData.name || "",
                      avatarUrl: memberData.avatarUrl || ""
                    };
                  } else {
                    return { id: member.id, name: "", avatarUrl: "" };
                  }
                } catch (error) {
                  console.error('Error resolving member reference:', error);
                  return { id: member.id, name: "", avatarUrl: "" };
                }
              }
              // If it's already a user object, keep safe fields only
              return {
                id: member.id || "",
                name: member.name || "",
                avatarUrl: member.avatarUrl || ""
              };
            }
            return { id: "", name: "", avatarUrl: "" };
          });
          
          safeMembers = await Promise.all(memberPromises);
        }
        
        // Safely process creator
        let safeCreator: any = { id: "", name: "", avatarUrl: "" };
        if (fullData.creator && typeof fullData.creator === 'object') {
          if (fullData.creator.id && fullData.creator.path) {
            // It's a DocumentReference - resolve it
            try {
              const creatorDoc = await getDoc(fullData.creator);
              if (creatorDoc.exists()) {
                const creatorData = creatorDoc.data();
                safeCreator = {
                  id: creatorDoc.id,
                  name: creatorData.name || "",
                  avatarUrl: creatorData.avatarUrl || ""
                };
              } else {
                safeCreator = { id: fullData.creator.id, name: "Unknown", avatarUrl: "" };
              }
            } catch (error) {
              console.error('Error resolving creator reference:', error);
              safeCreator = { id: fullData.creator.id, name: "Unknown", avatarUrl: "" };
            }
          } else {
            // It's already a user object
            safeCreator = {
              id: fullData.creator.id || "",
              name: fullData.creator.name || "",
              avatarUrl: fullData.creator.avatarUrl || ""
            };
          }
        }
        
        const safeGroup: Group = {
          id: group.id,
          name: String(fullData.name || ""),
          size: Number(fullData.size ?? 0),
          neighborhood: String(fullData.neighborhood || ""),
          vibe: String(fullData.vibe || ""),
          intent: (fullData.intent as GroupIntent) || "any",
          isOpenToMatch: Boolean(fullData.isOpenToMatch),
          pictureUrl: fullData.pictureUrl ? String(fullData.pictureUrl) : undefined,
          members: safeMembers,
          creator: safeCreator,
          compatibilityScore: score,
          matchReasoning: generateMatchReasoning(userGroup, group, score),
        };
        
        matchedGroups.push(safeGroup);
      } catch (error) {
        console.error('Error processing group:', group.id, error);
        // Skip this group if there's an error
      }
    }

    console.log(`Found ${matchedGroups.length} matches`);
    
    // Deep clone to break any remaining circular references
    let safeMatchedGroups: Group[];
    try {
      safeMatchedGroups = JSON.parse(JSON.stringify(matchedGroups));
    } catch (error) {
      console.error('Error serializing matches, returning empty array:', error);
      safeMatchedGroups = [];
    }
    
    // Cache the results
    matchCache.set(userGroupId, {
      matches: safeMatchedGroups,
      timestamp: Date.now()
    });
    
    console.timeEnd('findPotentialMatches');
    return safeMatchedGroups;
    
  } catch (error) {
    console.error('Error in matching system:', error);
    console.timeEnd('findPotentialMatches');
    return [];
  }
  };
  
  // Race between matching and timeout
  try {
    return await Promise.race([matchingPromise(), timeoutPromise]);
  } catch (error) {
    console.error('Matching failed or timed out:', error);
    console.timeEnd('findPotentialMatches');
    return [];
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
                        neighborhood: targetGroupData.neighborhood,
                        vibe: targetGroupData.vibe,
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

// Democracy Mode Voting Functions

export async function castVote(invitationId: string, userId: string, userName: string, decision: 'accept' | 'reject') {
  try {
    // Create vote document
    const voteRef = await addDoc(collection(db, 'votes'), {
      invitationId,
      userId,
      userName,
      decision,
      votedAt: serverTimestamp()
    });

    // Check if this completes the voting process
    await checkAndProcessVote(invitationId);

    return { success: true, voteId: voteRef.id };
  } catch (error) {
    console.error('Error casting vote:', error);
    return { success: false, error: 'Failed to cast vote' };
  }
}

export async function checkAndProcessVote(invitationId: string) {
  try {
    // Get the invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    
    if (!invitationSnap.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = invitationSnap.data() as Invitation;
    
    // Get the receiving group to check member count
    const toGroupSnap = await getDoc(invitation.toGroup);
    if (!toGroupSnap.exists()) {
      throw new Error('Receiving group not found');
    }
    
    const toGroup = toGroupSnap.data() as Group;
    const totalMembers = toGroup.members.length;

    // Get all votes for this invitation
    const votesQuery = query(
      collection(db, 'votes'),
      where('invitationId', '==', invitationId)
    );
    const votesSnap = await getDocs(votesQuery);
    
    const votes: Vote[] = votesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Vote));

    // Count votes
    const acceptVotes = votes.filter(vote => vote.decision === 'accept').length;
    const rejectVotes = votes.filter(vote => vote.decision === 'reject').length;
    const totalVotes = acceptVotes + rejectVotes;

    // Check if all members have voted
    if (totalVotes >= totalMembers) {
      const majorityThreshold = Math.ceil(totalMembers / 2);
      let finalDecision: 'accepted' | 'rejected';

      if (acceptVotes >= majorityThreshold) {
        finalDecision = 'accepted';
      } else {
        finalDecision = 'rejected'; // Default to rejection in case of tie
      }

      // Update invitation with final decision
      await updateDoc(invitationRef, {
        status: finalDecision,
        respondedAt: serverTimestamp(),
        totalVotes,
        acceptVotes,
        rejectVotes,
        voteComplete: true
      });

      if (finalDecision === 'accepted') {
        // Create match
        await createMatchFromInvitation(invitation);
        
        // Clear all other pending invitations for both groups
        await clearPendingInvitations(invitation.toGroup, invitation.fromGroup);
      }

      // Clean up votes
      const voteBatch = votesSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(voteBatch);

      return { voteComplete: true, decision: finalDecision };
    }

    // Update invitation with current vote counts
    await updateDoc(invitationRef, {
      totalVotes,
      acceptVotes,
      rejectVotes,
      voteComplete: false
    });

    return { voteComplete: false, totalVotes, acceptVotes, rejectVotes };
  } catch (error) {
    console.error('Error processing vote:', error);
    throw error;
  }
}

async function createMatchFromInvitation(invitation: Invitation) {
  try {
    // Check if either group already has a match
    const fromGroupMatchesQuery = query(
      collection(db, 'matches'),
      where('groups', 'array-contains', invitation.fromGroup)
    );
    const toGroupMatchesQuery = query(
      collection(db, 'matches'),
      where('groups', 'array-contains', invitation.toGroup)
    );

    const [fromMatches, toMatches] = await Promise.all([
      getDocs(fromGroupMatchesQuery),
      getDocs(toGroupMatchesQuery)
    ]);

    if (!fromMatches.empty || !toMatches.empty) {
      throw new Error('One of the groups already has a match');
    }

    // Create match - venue suggestion will be added asynchronously
    const matchRef = await addDoc(collection(db, 'matches'), {
      groups: [invitation.toGroup, invitation.fromGroup],
      createdAt: serverTimestamp()
    });

    // Add venue suggestion asynchronously (non-blocking)
    addVenueSuggestionToMatch(matchRef.id).catch(error => 
      console.error('Failed to add venue suggestion to majority rules match:', error)
    );

    // Update both groups to mark them as having active matches
    await Promise.all([
      updateDoc(invitation.toGroup, { hasActiveMatch: true }),
      updateDoc(invitation.fromGroup, { hasActiveMatch: true })
    ]);

    console.log('Match created successfully with venue suggestion');
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

export async function clearAllPendingInvitations(group1: DocumentReference, group2: DocumentReference) {
  'use server';
  return clearPendingInvitations(group1, group2);
}

async function clearPendingInvitations(group1: DocumentReference, group2: DocumentReference) {
  try {
    // Get all pending invitations for both groups
    const invitationsQuery1 = query(
      collection(db, 'invitations'),
      where('toGroup', '==', group1),
      where('status', '==', 'pending')
    );
    const invitationsQuery2 = query(
      collection(db, 'invitations'),
      where('toGroup', '==', group2),
      where('status', '==', 'pending')
    );
    const invitationsQuery3 = query(
      collection(db, 'invitations'),
      where('fromGroup', '==', group1),
      where('status', '==', 'pending')
    );
    const invitationsQuery4 = query(
      collection(db, 'invitations'),
      where('fromGroup', '==', group2),
      where('status', '==', 'pending')
    );

    const [invitations1, invitations2, invitations3, invitations4] = await Promise.all([
      getDocs(invitationsQuery1),
      getDocs(invitationsQuery2),
      getDocs(invitationsQuery3),
      getDocs(invitationsQuery4)
    ]);

    // Delete all pending invitations
    const deleteBatch = [
      ...invitations1.docs.map(doc => deleteDoc(doc.ref)),
      ...invitations2.docs.map(doc => deleteDoc(doc.ref)),
      ...invitations3.docs.map(doc => deleteDoc(doc.ref)),
      ...invitations4.docs.map(doc => deleteDoc(doc.ref))
    ];

    await Promise.all(deleteBatch);
    console.log('Cleared pending invitations');
  } catch (error) {
    console.error('Error clearing pending invitations:', error);
  }
}

/**
 * Retry function with exponential backoff for Firestore operations
 */
async function retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isOfflineError = error?.code === 'unavailable' || error?.message?.includes('offline');
      const isLastAttempt = attempt === maxRetries;
      
      if (isOfflineError && !isLastAttempt) {
        console.log(`Attempt ${attempt} failed (offline), retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Delete a match and reset both groups to be available for new matches
 * Only group creators can delete matches
 */
export async function deleteMatch(matchId: string, userId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting match deletion process...');
    
    // Get match document with retry
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await retryOperation(() => getDoc(matchRef));
    
    if (!matchDoc.exists()) {
      return { success: false, message: 'Match not found.' };
    }
    
    const matchData = matchDoc.data();
    const groupRefs = matchData.groups as DocumentReference[];
    
    // Get both group documents to check permissions with retry
    const [group1Doc, group2Doc] = await retryOperation(() => 
      Promise.all([
        getDoc(groupRefs[0]),
        getDoc(groupRefs[1])
      ])
    );
    
    if (!group1Doc.exists() || !group2Doc.exists()) {
      return { success: false, message: 'Group data not found.' };
    }
    
    const group1Data = group1Doc.data();
    const group2Data = group2Doc.data();
    
    // Check if user is a creator of either group
    const isGroup1Creator = (group1Data.creator as DocumentReference)?.id === userId;
    const isGroup2Creator = (group2Data.creator as DocumentReference)?.id === userId;
    
    if (!isGroup1Creator && !isGroup2Creator) {
      return { success: false, message: 'Only group creators can end matches.' };
    }
    
    const group1Id = groupRefs[0].id;
    const group2Id = groupRefs[1].id;
    
    console.log('Permission check passed, starting cleanup operations...');
    
    // Step 1: Delete messages (non-critical, continue if fails)
    try {
      console.log('Deleting messages...');
      const messagesQuery = query(collection(db, 'matches', matchId, 'messages'));
      const messagesSnapshot = await retryOperation(() => getDocs(messagesQuery));
      const messageDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await retryOperation(() => Promise.all(messageDeletePromises));
      console.log('Messages deleted successfully');
    } catch (error) {
      console.error('Failed to delete messages (continuing):', error);
    }
    
    // Step 2: Clear swipe history (non-critical, continue if fails)
    try {
      console.log('Clearing swipe history...');
      const group1SwipeRef = doc(db, 'groups', group1Id, 'swipes', group2Id);
      const group2SwipeRef = doc(db, 'groups', group2Id, 'swipes', group1Id);
      
      await retryOperation(() => Promise.all([
        deleteDoc(group1SwipeRef),
        deleteDoc(group2SwipeRef)
      ]));
      console.log('Swipe history cleared successfully');
    } catch (error) {
      console.error('Failed to clear swipe history (continuing):', error);
    }
    
    // Step 3: Clear pending invitations (non-critical, continue if fails)
    try {
      console.log('Clearing pending invitations...');
      await retryOperation(() => clearPendingInvitations(groupRefs[0], groupRefs[1]));
      console.log('Pending invitations cleared successfully');
    } catch (error) {
      console.error('Failed to clear invitations (continuing):', error);
    }
    
    // Step 4: Reset group availability (critical - this must succeed)
    console.log('Resetting group availability...');
    await retryOperation(() => Promise.all([
      updateDoc(groupRefs[0], { hasActiveMatch: false }),
      updateDoc(groupRefs[1], { hasActiveMatch: false })
    ]));
    console.log('Groups reset to available status');
    
    // Step 5: Clear match cache (always succeeds)
    clearMatchCache(group1Id);
    clearMatchCache(group2Id);
    console.log('Match cache cleared');
    
    // Step 6: Delete the match document (critical - this must succeed)
    console.log('Deleting match document...');
    await retryOperation(() => deleteDoc(matchRef));
    
    console.log('Match deletion completed successfully');
    return { success: true, message: 'Match ended successfully. Both groups are now available for new matches.' };
    
  } catch (error: any) {
    console.error('Error deleting match:', error);
    
    // Provide more specific error messages
    if (error?.code === 'unavailable') {
      return { 
        success: false, 
        message: 'Connection issue detected. Please check your internet connection and try again.' 
      };
    }
    
    return { 
      success: false, 
      message: `Failed to end match: ${error?.message || 'Unknown error'}. Please try again.` 
    };
  }
}

/**
 * Add venue suggestion to an existing match
 * This is called after a match is created to add venue suggestions asynchronously
 */
export async function addVenueSuggestionToMatch(matchId: string): Promise<void> {
  try {
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    
    if (!matchDoc.exists()) {
      console.error('Match not found for venue suggestion');
      return;
    }
    
    const matchData = matchDoc.data();
    
    // Skip if venue suggestion already exists
    if (matchData.venueSuggestion) {
      return;
    }
    
    const groupRefs = matchData.groups as DocumentReference[];
    
    // Get both group documents
    const [group1Doc, group2Doc] = await Promise.all([
      getDoc(groupRefs[0]),
      getDoc(groupRefs[1])
    ]);
    
    if (!group1Doc.exists() || !group2Doc.exists()) {
      console.error('Group documents not found for venue suggestion');
      return;
    }
    
    const group1Data = { id: group1Doc.id, ...group1Doc.data() } as Group;
    const group2Data = { id: group2Doc.id, ...group2Doc.data() } as Group;
    
    // Get venue suggestion
    const venueResult = await getVenueSuggestionForMatch(group1Data, group2Data);
    
    // Update match with venue suggestion
    const updateData: any = {
      venueSuggestion: venueResult.venueSuggestion,
      venueReasoning: venueResult.reasoning
    };
    
    if (venueResult.venueUrl) updateData.venueUrl = venueResult.venueUrl;
    if (venueResult.venueDescription) updateData.venueDescription = venueResult.venueDescription;
    
    await updateDoc(matchRef, updateData);
    console.log('Venue suggestion added to match:', matchId);
    
  } catch (error) {
    console.error('Error adding venue suggestion to match:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Debug matching issues by checking swipe history and match status
 */
export async function debugMatchingIssue(groupId: string): Promise<any> {
  'use server';
  
  try {
    console.log(`=== DEBUGGING MATCHING FOR GROUP ${groupId} ===`);
    
    // Get group data
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      return { error: 'Group not found' };
    }
    
    const groupData = groupDoc.data();
    console.log('Group data:', {
      id: groupId,
      name: groupData.name,
      isOpenToMatch: groupData.isOpenToMatch,
      hasActiveMatch: groupData.hasActiveMatch,
      intent: groupData.intent,
      neighborhood: groupData.neighborhood,
      vibe: groupData.vibe,
      size: groupData.size
    });
    
    // Get swipe history
    const swipesQuery = collection(db, 'groups', groupId, 'swipes');
    const swipesSnapshot = await getDocs(swipesQuery);
    
    const swipeHistory: any[] = [];
    swipesSnapshot.docs.forEach(doc => {
      swipeHistory.push({
        targetGroupId: doc.id,
        swipeData: doc.data()
      });
    });
    
    console.log('Swipe history:', swipeHistory);
    
    // Get active matches
    const matchesQuery = query(
      collection(db, 'matches'),
      where('groups', 'array-contains', groupRef)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    
    const activeMatches: any[] = [];
    matchesSnapshot.docs.forEach(doc => {
      const matchData = doc.data();
      activeMatches.push({
        matchId: doc.id,
        groups: matchData.groups.map((ref: any) => ref.id),
        createdAt: matchData.createdAt
      });
    });
    
    console.log('Active matches:', activeMatches);
    
    // Check what groups should be visible
    const potentialMatches = await findPotentialMatches(groupId);
    console.log('Current potential matches:', potentialMatches.map(g => ({ id: g.id, name: g.name })));
    
    return {
      groupData: {
        id: groupId,
        name: groupData.name,
        isOpenToMatch: groupData.isOpenToMatch,
        hasActiveMatch: groupData.hasActiveMatch,
        intent: groupData.intent,
        neighborhood: groupData.neighborhood,
        vibe: groupData.vibe,
        size: groupData.size
      },
      swipeHistory,
      activeMatches,
      potentialMatches: potentialMatches.map(g => ({ id: g.id, name: g.name }))
    };
    
  } catch (error) {
    console.error('Error debugging matching issue:', error);
    return { error: error };
  }
}

/**
 * Manually clear swipe history between two groups
 * Useful for debugging and testing
 */
export async function clearSwipeHistory(group1Id: string, group2Id: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Manually clearing swipe history between ${group1Id} and ${group2Id}`);
    
    const group1SwipeRef = doc(db, 'groups', group1Id, 'swipes', group2Id);
    const group2SwipeRef = doc(db, 'groups', group2Id, 'swipes', group1Id);
    
    // Check if swipes exist
    const [group1SwipeDoc, group2SwipeDoc] = await Promise.all([
      getDoc(group1SwipeRef),
      getDoc(group2SwipeRef)
    ]);
    
    const group1Had = group1SwipeDoc.exists();
    const group2Had = group2SwipeDoc.exists();
    
    console.log(`Before: Group ${group1Id} -> ${group2Id}: ${group1Had}`);
    console.log(`Before: Group ${group2Id} -> ${group1Id}: ${group2Had}`);
    
    // Delete both swipe records
    await Promise.all([
      deleteDoc(group1SwipeRef),
      deleteDoc(group2SwipeRef)
    ]);
    
    // Clear cache for both groups
    clearMatchCache(group1Id);
    clearMatchCache(group2Id);
    
    // Verify deletion
    const [group1SwipeDocAfter, group2SwipeDocAfter] = await Promise.all([
      getDoc(group1SwipeRef),
      getDoc(group2SwipeRef)
    ]);
    
    console.log(`After: Group ${group1Id} -> ${group2Id}: ${group1SwipeDocAfter.exists()}`);
    console.log(`After: Group ${group2Id} -> ${group1Id}: ${group2SwipeDocAfter.exists()}`);
    
    return {
      success: true,
      message: `Swipe history cleared. Group ${group1Id} had swipe: ${group1Had}, Group ${group2Id} had swipe: ${group2Had}`
    };
    
  } catch (error) {
    console.error('Error clearing swipe history:', error);
    return {
      success: false,
      message: 'Failed to clear swipe history'
    };
  }
}

/**
 * Report a message for inappropriate content
 */
export async function reportMessage(
  messageId: string,
  matchId: string,
  reportedUserId: string,
  reporterUserId: string,
  reporterGroupId: string,
  reason: 'spam' | 'inappropriate' | 'harassment' | 'other',
  description?: string
): Promise<{ success: boolean; message: string }> {
  'use server';
  
  try {
    // Get references
    const reportedUserRef = doc(db, 'users', reportedUserId);
    const reporterUserRef = doc(db, 'users', reporterUserId);
    const reporterGroupRef = doc(db, 'groups', reporterGroupId);
    
    // Create report document
    const reportRef = await addDoc(collection(db, 'reports'), {
      messageId,
      matchId,
      reportedBy: reporterUserRef,
      reportedUser: reportedUserRef,
      reporterGroup: reporterGroupRef,
      reason,
      description: description || '',
      createdAt: serverTimestamp(),
      status: 'pending'
    });
    
    console.log('Message reported:', reportRef.id);
    
    return {
      success: true,
      message: 'Message reported successfully. Group admins will review it.'
    };
    
  } catch (error) {
    console.error('Error reporting message:', error);
    return {
      success: false,
      message: 'Failed to report message. Please try again.'
    };
  }
}

/**
 * Get all reports for groups where the user is an admin
 * Shows reports from matches involving the admin's groups
 */
export async function getReportsForAdmin(userId: string): Promise<Report[]> {
  'use server';
  
  try {
    console.log('Getting reports for admin:', userId);
    
    // First, get all groups where the user is the creator
    const groupsQuery = query(
      collection(db, 'groups'),
      where('creator', '==', doc(db, 'users', userId))
    );
    
    const groupsSnapshot = await getDocs(groupsQuery);
    const userGroupIds = groupsSnapshot.docs.map(doc => doc.id);
    
    console.log('User is admin of groups:', userGroupIds);
    
    if (userGroupIds.length === 0) {
      console.log('User is not admin of any groups');
      return [];
    }
    
    // Get all reports and filter them manually to avoid complex queries
    const allReportsQuery = query(
      collection(db, 'reports'),
      where('status', '==', 'pending')
    );
    
    const allReportsSnapshot = await getDocs(allReportsQuery);
    console.log('Total pending reports:', allReportsSnapshot.docs.length);
    
    const reports: Report[] = [];
    
    for (const reportDoc of allReportsSnapshot.docs) {
      const reportData = reportDoc.data();
      console.log('Checking report:', reportDoc.id, 'matchId:', reportData.matchId);
      
      // Get the match to see if it involves any of the user's groups
      const matchDoc = await getDoc(doc(db, 'matches', reportData.matchId));
      
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        const matchGroupRefs = matchData.groups as DocumentReference[];
        const matchGroupIds = matchGroupRefs.map(ref => ref.id);
        
        console.log('Match groups:', matchGroupIds);
        
        // Check if any of the user's groups are involved in this match
        const isInvolvedInMatch = userGroupIds.some(groupId => matchGroupIds.includes(groupId));
        
        console.log('User involved in match:', isInvolvedInMatch);
        
        if (isInvolvedInMatch) {
          // Get the populated user and group data
          const [reportedByDoc, reportedUserDoc, reporterGroupDoc] = await Promise.all([
            getDoc(reportData.reportedBy),
            getDoc(reportData.reportedUser),
            getDoc(reportData.reporterGroup)
          ]);
          
          // Safely serialize the data to avoid circular references
          const reportedByData = reportedByDoc.exists() ? 
            JSON.parse(JSON.stringify({ id: reportedByDoc.id, ...reportedByDoc.data() })) : 
            { id: 'unknown', name: 'Unknown User' };
            
          const reportedUserData = reportedUserDoc.exists() ? 
            JSON.parse(JSON.stringify({ id: reportedUserDoc.id, ...reportedUserDoc.data() })) : 
            { id: 'unknown', name: 'Unknown User' };
            
          const reporterGroupData = reporterGroupDoc.exists() ? 
            JSON.parse(JSON.stringify({ id: reporterGroupDoc.id, ...reporterGroupDoc.data() })) : 
            { id: 'unknown', name: 'Unknown Group' };
          
          reports.push({
            id: reportDoc.id,
            messageId: reportData.messageId,
            matchId: reportData.matchId,
            reportedBy: reportedByData,
            reportedUser: reportedUserData,
            reporterGroup: reporterGroupData,
            reason: reportData.reason,
            description: reportData.description || '',
            createdAt: reportData.createdAt ? reportData.createdAt.toDate() : new Date(),
            status: reportData.status
          });
        }
      }
    }
    
    console.log('Found reports for admin:', reports.length);
    return reports;
    
  } catch (error) {
    console.error('Error getting reports for admin:', error);
    return [];
  }
}
