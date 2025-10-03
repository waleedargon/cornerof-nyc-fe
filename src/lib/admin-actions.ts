'use server';

import { 
  doc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  arrayRemove,
  writeBatch,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import type { Group, User } from '@/lib/types';

/**
 * Delete a group and handle all cascading effects:
 * - Remove all members from the group
 * - Delete all invitations sent/received by this group
 * - Delete associated chatrooms/matches
 * - Make other groups available for matching again
 */
export async function deleteGroupWithCascade(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    
    // 1. Get the group data first
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      return { success: false, error: 'Group not found' };
    }
    
    const groupData = groupDoc.data() as Group;
    
    // 2. Delete all invitations involving this group
    const invitationsQuery1 = query(
      collection(db, 'invitations'),
      where('fromGroup', '==', groupRef)
    );
    const invitationsQuery2 = query(
      collection(db, 'invitations'),
      where('toGroup', '==', groupRef)
    );
    
    const [sentInvitations, receivedInvitations] = await Promise.all([
      getDocs(invitationsQuery1),
      getDocs(invitationsQuery2)
    ]);
    
    // Delete all invitations
    [...sentInvitations.docs, ...receivedInvitations.docs].forEach(inviteDoc => {
      batch.delete(doc(db, 'invitations', inviteDoc.id));
    });
    
    // 3. Find and delete matches/chatrooms involving this group
    const matchesQuery = query(
      collection(db, 'matches'),
      where('groups', 'array-contains', groupRef)
    );
    const matchesDocs = await getDocs(matchesQuery);
    
    // For each match, we need to free up the other group for matching
    const otherGroupsToUpdate: string[] = [];
    
    matchesDocs.docs.forEach(matchDoc => {
      const matchData = matchDoc.data();
      const groups = matchData.groups || [];
      
      // Find the other group in the match
      groups.forEach((otherGroupRef: any) => {
        if (otherGroupRef.id !== groupId) {
          otherGroupsToUpdate.push(otherGroupRef.id);
        }
      });
      
      // Delete the match
      batch.delete(doc(db, 'matches', matchDoc.id));
    });
    
    // 4. Update other groups to make them available for matching again
    for (const otherGroupId of otherGroupsToUpdate) {
      const otherGroupRef = doc(db, 'groups', otherGroupId);
      batch.update(otherGroupRef, {
        hasActiveMatch: false,
        isOpenToMatch: true
      });
    }
    
    // 5. Delete the group itself
    batch.delete(groupRef);
    
    // 6. Commit all changes
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: 'Failed to delete group' };
  }
}

/**
 * Delete a user and handle cascading effects:
 * - Remove user from all groups they're a member of
 * - Transfer group ownership if they're a creator
 * - Delete user's Firebase Auth account
 */
export async function deleteUserWithCascade(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    
    // 1. Find all groups where user is a member
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userRef)
    );
    const groupsDocs = await getDocs(groupsQuery);
    
    // 2. Remove user from all groups and handle creator transfer
    for (const groupDoc of groupsDocs.docs) {
      const groupData = groupDoc.data() as Group;
      const groupRef = doc(db, 'groups', groupDoc.id);
      
      // Remove user from members array
      batch.update(groupRef, {
        members: arrayRemove(userRef)
      });
      
      // If user is the creator, transfer ownership to another member or delete group
      if (groupData.creator && (groupData.creator as any).id === userId) {
        const remainingMembers = (groupData.members || []).filter(
          (member: any) => member.id !== userId
        );
        
        if (remainingMembers.length > 0) {
          // Transfer ownership to the first remaining member
          const newCreator = remainingMembers[0];
          batch.update(groupRef, {
            creator: doc(db, 'users', (newCreator as any).id)
          });
        } else {
          // No remaining members, delete the group
          batch.delete(groupRef);
          
          // Also clean up related data (invitations, matches)
          const invitationsQuery1 = query(
            collection(db, 'invitations'),
            where('fromGroup', '==', groupRef)
          );
          const invitationsQuery2 = query(
            collection(db, 'invitations'),
            where('toGroup', '==', groupRef)
          );
          
          const [sentInvitations, receivedInvitations] = await Promise.all([
            getDocs(invitationsQuery1),
            getDocs(invitationsQuery2)
          ]);
          
          [...sentInvitations.docs, ...receivedInvitations.docs].forEach(inviteDoc => {
            batch.delete(doc(db, 'invitations', inviteDoc.id));
          });
          
          const matchesQuery = query(
            collection(db, 'matches'),
            where('groups', 'array-contains', groupRef)
          );
          const matchesDocs = await getDocs(matchesQuery);
          
          matchesDocs.docs.forEach(matchDoc => {
            batch.delete(doc(db, 'matches', matchDoc.id));
          });
        }
      }
    }
    
    // 3. Delete user document
    batch.delete(userRef);
    
    // 4. Commit Firestore changes
    await batch.commit();
    
    // 5. Delete Firebase Auth user
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError) {
      console.error('Error deleting Firebase Auth user:', authError);
      // Continue even if auth deletion fails
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

/**
 * Create a new user with auto-verification
 */
export async function createUserWithAutoVerification(userData: {
  name: string;
  phone: string;
  email?: string;
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // 1. Check if user with this phone number already exists in Firebase Auth
    try {
      const existingUser = await adminAuth.getUserByPhoneNumber(userData.phone);
      if (existingUser) {
        return { 
          success: false, 
          error: `A user with phone number ${userData.phone} already exists. Please use a different phone number or delete the existing user first.` 
        };
      }
    } catch (error: any) {
      // If getUserByPhoneNumber throws an error, it means user doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error);
        return { success: false, error: 'Failed to verify phone number availability' };
      }
    }

    // 2. Create Firebase Auth user
    const createUserData: any = {
      phoneNumber: userData.phone,
      displayName: userData.name,
      emailVerified: true,
      disabled: false
    };
    
    // Only include email if it's provided and not empty
    if (userData.email && userData.email.trim() !== '') {
      createUserData.email = userData.email;
    }
    
    const userRecord = await adminAuth.createUser(createUserData);
    
    // 3. Create Firestore user document
    const userRef = doc(db, 'users', userRecord.uid);
    const userDocData: any = {
      name: userData.name,
      phone: userData.phone,
      createdAt: new Date(),
      isVerified: true,
      createdByAdmin: true
    };
    
    // Only include email if it's provided and not empty
    if (userData.email && userData.email.trim() !== '') {
      userDocData.email = userData.email;
    }
    
    await setDoc(userRef, userDocData);
    
    return { success: true, userId: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide more specific error messages
    if (error.code === 'auth/phone-number-already-exists') {
      return { 
        success: false, 
        error: `Phone number ${userData.phone} is already registered. Please use a different phone number.` 
      };
    } else if (error.code === 'auth/invalid-phone-number') {
      return { 
        success: false, 
        error: 'Invalid phone number format. Please use international format (e.g., +1234567890).' 
      };
    } else if (error.code === 'auth/email-already-exists') {
      return { 
        success: false, 
        error: 'Email address is already registered. Please use a different email.' 
      };
    }
    
    return { success: false, error: 'Failed to create user. Please try again.' };
  }
}

/**
 * Clean up orphaned Firebase Auth user (exists in Auth but not in Firestore)
 */
export async function cleanupOrphanedAuthUser(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the Firebase Auth user by phone number
    const authUser = await adminAuth.getUserByPhoneNumber(phoneNumber);
    
    // Check if this user exists in Firestore
    const userRef = doc(db, 'users', authUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // User exists in Auth but not in Firestore - delete from Auth
      await adminAuth.deleteUser(authUser.uid);
      return { success: true };
    } else {
      return { success: false, error: 'User exists in both Auth and Firestore' };
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return { success: true }; // User doesn't exist, which is what we want
    }
    console.error('Error cleaning up orphaned user:', error);
    return { success: false, error: 'Failed to cleanup orphaned user' };
  }
}
