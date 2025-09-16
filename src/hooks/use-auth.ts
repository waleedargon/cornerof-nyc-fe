
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';

// In a real app, this would use Firebase Auth and a proper global state manager.
// For now, we'll simulate a logged-in user by storing their ID in localStorage.

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
        try {
            // Only access localStorage on client-side
            if (typeof window !== 'undefined') {
                const userPhone = localStorage.getItem('userPhone');
                const userId = localStorage.getItem('userId');
                const userName = localStorage.getItem('userName');
                
                if (userPhone && userId && userName) {
                    setUser({
                        id: userId,
                        name: userName,
                        phone: userPhone,
                    });
                } else {
                    // If any piece is missing, we're not logged in.
                    localStorage.removeItem('userPhone');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userName');
                    setUser(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }
    
    checkUser();
  }, []);

  return { user, loading };
}
