'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { useFirebaseAuth } from './use-firebase-auth';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  user: User | null;
  error: string | null;
}

export function useAdminAuth() {
  const { user, loading: authLoading } = useFirebaseAuth();
  const [adminState, setAdminState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    user: null,
    error: null
  });

  // Cache admin status for a short time to avoid repeated API calls
  const [lastVerified, setLastVerified] = useState<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds

  useEffect(() => {
    
    if (authLoading) {
      setAdminState(prev => ({ ...prev, loading: true }));
      return;
    }

    if (!user) {
      // Clear any cached admin status when user signs out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminStatus');
      }
      setAdminState({
        isAdmin: false,
        loading: false,
        user: null,
        error: null
      });
      return;
    }

    // Check localStorage for recent admin status
    if (typeof window !== 'undefined') {
      const cachedStatus = localStorage.getItem('adminStatus');
      if (cachedStatus) {
        try {
          const { isAdmin, timestamp, uid } = JSON.parse(cachedStatus);
          const now = Date.now();
              // Use cached status if it's recent and for the same user
              if (user.uid === uid && (now - timestamp) < CACHE_DURATION && isAdmin) {
            setAdminState({
              isAdmin: true,
              loading: false,
              user: user,
              error: null
            });
            return;
          } else {
            console.log('❌ Cache invalid:', { 
              userMatch: user.uid === uid, 
              timeValid: (now - timestamp) < CACHE_DURATION, 
              isAdmin,
              userUid: user.uid,
              cachedUid: uid
            });
          }
        } catch (e) {
          // Invalid cache, continue with verification
          localStorage.removeItem('adminStatus');
        }
      }
    }

    const verifyAdminStatus = async () => {
      try {
        console.log('🔍 Starting admin verification for user:', user.uid);
        
        // Check if we have recent verification
        const now = Date.now();
        if (adminState.isAdmin && (now - lastVerified) < CACHE_DURATION) {
          console.log('✅ Using memory cached admin status');
          setAdminState(prev => ({ ...prev, loading: false, user }));
          return;
        }

        console.log('🔑 Getting ID token for verification...');
        const idToken = await user.getIdToken(true);
        
        const response = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: idToken }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Admin verification successful:', data);
          setAdminState({
            isAdmin: data.isAdmin,
            loading: false,
            user: user,
            error: null
          });
          if (data.isAdmin) {
            setLastVerified(now);
            // Cache admin status in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminStatus', JSON.stringify({
                isAdmin: true,
                timestamp: now,
                uid: user.uid
              }));
              console.log('💾 Admin status cached for user:', user.uid);
            }
          }
        } else {
          const errorData = await response.json();
          setAdminState({
            isAdmin: false,
            loading: false,
            user: user,
            error: errorData.error || 'Admin verification failed'
          });
        }
      } catch (error: any) {
        console.error('Admin verification error:', error);
        setAdminState({
          isAdmin: false,
          loading: false,
          user: user,
          error: error.message || 'Failed to verify admin status'
        });
      }
    };

    verifyAdminStatus();
  }, [user, authLoading]);

  return adminState;
}
