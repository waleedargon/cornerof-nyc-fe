'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminLog } from '@/lib/types';

/**
 * Log admin activities to Firestore for monitoring and audit purposes
 */
export async function logAdminActivity({
  userId,
  userName,
  groupId,
  groupName,
  matchId,
  action,
  details,
  metadata
}: Omit<AdminLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    await addDoc(collection(db, 'admin_logs'), {
      timestamp: serverTimestamp(),
      userId,
      userName,
      groupId,
      groupName,
      matchId,
      action,
      details,
      metadata: metadata || {}
    });
    
    console.log(`📝 Admin log: ${action} - ${details}`);
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw - logging should not break the main functionality
  }
}

/**
 * Helper functions for common logging scenarios
 */
export const AdminLogger = {
  // Group activities
  groupCreated: (groupId: string, groupName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'group_created',
      groupId,
      groupName,
      userId,
      userName,
      details: `Group "${groupName}" was created by ${userName}`
    }),

  groupDeleted: (groupId: string, groupName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'group_deleted',
      groupId,
      groupName,
      userId,
      userName,
      details: `Group "${groupName}" was deleted by admin`
    }),

  userJoinedGroup: (groupId: string, groupName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'user_joined_group',
      groupId,
      groupName,
      userId,
      userName,
      details: `${userName} joined group "${groupName}"`
    }),

  userLeftGroup: (groupId: string, groupName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'user_left_group',
      groupId,
      groupName,
      userId,
      userName,
      details: `${userName} left group "${groupName}"`
    }),

  // Match activities
  matchCreated: (matchId: string, group1Name: string, group2Name: string) =>
    logAdminActivity({
      action: 'match_created',
      matchId,
      details: `Match created between "${group1Name}" and "${group2Name}"`
    }),

  matchDeleted: (matchId: string, group1Name: string, group2Name: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'match_deleted',
      matchId,
      userId,
      userName,
      details: `Match between "${group1Name}" and "${group2Name}" was deleted by ${userName}`
    }),

  // Message activities
  messageSent: (userId: string, userName: string, matchId: string, messageLength: number) =>
    logAdminActivity({
      action: 'message_sent',
      matchId,
      userId,
      userName,
      details: `${userName} sent a message (${messageLength} characters)`,
      metadata: { messageLength }
    }),

  messageReported: (reportedUserId: string, reportedUserName: string, reporterUserId: string, reporterUserName: string, matchId: string, reason: string) =>
    logAdminActivity({
      action: 'message_reported',
      matchId,
      userId: reportedUserId,
      userName: reportedUserName,
      details: `Message by ${reportedUserName} was reported by ${reporterUserName} for: ${reason}`,
      metadata: { reporterUserId, reporterUserName, reason }
    }),

  // Venue activities
  venueCreated: (venueName: string, neighborhood: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'venue_created',
      userId,
      userName,
      details: `Venue "${venueName}" in ${neighborhood} was created by admin`,
      metadata: { venueName, neighborhood }
    }),

  venueUpdated: (venueName: string, neighborhood: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'venue_updated',
      userId,
      userName,
      details: `Venue "${venueName}" in ${neighborhood} was updated by admin`,
      metadata: { venueName, neighborhood }
    }),

  venueDeleted: (venueName: string, neighborhood: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'venue_deleted',
      userId,
      userName,
      details: `Venue "${venueName}" in ${neighborhood} was deleted by admin`,
      metadata: { venueName, neighborhood }
    }),

  // Neighborhood activities
  neighborhoodCreated: (neighborhoodName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'neighborhood_created',
      userId,
      userName,
      details: `Neighborhood "${neighborhoodName}" was created by admin`,
      metadata: { neighborhoodName }
    }),

  neighborhoodUpdated: (neighborhoodName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'neighborhood_updated',
      userId,
      userName,
      details: `Neighborhood "${neighborhoodName}" was updated by admin`,
      metadata: { neighborhoodName }
    }),

  neighborhoodDeleted: (neighborhoodName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'neighborhood_deleted',
      userId,
      userName,
      details: `Neighborhood "${neighborhoodName}" was deleted by admin`,
      metadata: { neighborhoodName }
    }),

  // Vibe activities
  vibeCreated: (vibeName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'vibe_created',
      userId,
      userName,
      details: `Vibe "${vibeName}" was created by admin`,
      metadata: { vibeName }
    }),

  vibeUpdated: (vibeName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'vibe_updated',
      userId,
      userName,
      details: `Vibe "${vibeName}" was updated by admin`,
      metadata: { vibeName }
    }),

  vibeDeleted: (vibeName: string, userId: string, userName: string) =>
    logAdminActivity({
      action: 'vibe_deleted',
      userId,
      userName,
      details: `Vibe "${vibeName}" was deleted by admin`,
      metadata: { vibeName }
    })
};
