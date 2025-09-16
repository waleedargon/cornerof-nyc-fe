'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to load from localStorage for faster UI response
    const cachedUserId = localStorage.getItem('userId');
    if (cachedUserId) {
        const cachedUserName = localStorage.getItem('userName');
        const cachedUserPhone = localStorage.getItem('userPhone');
        const cachedUserAvatar = localStorage.getItem('userAvatar');
        setUser({
            id: cachedUserId,
            name: cachedUserName || '',
            phone: cachedUserPhone || '',
            avatarUrl: cachedUserAvatar || '',
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const usersRef = collection(db, 'users');
        // Primary method: find user by firebaseUid
        let q = query(usersRef, where('firebaseUid', '==', authUser.uid));
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty && authUser.phoneNumber) {
            // Fallback for migrating users: find by phone number
            q = query(usersRef, where('phone', '==', authUser.phoneNumber));
            querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // If found by phone, update the doc with firebaseUid for future logins
                const userDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, 'users', userDoc.id), { firebaseUid: authUser.uid });
            }
        }

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          const freshUser: User = {
            id: userDoc.id,
            name: userData.name,
            phone: userData.phone,
            avatarUrl: userData.avatarUrl,
            ...userData
          };
          setUser(freshUser);
          // Refresh localStorage
          localStorage.setItem('userId', freshUser.id);
          localStorage.setItem('userName', freshUser.name);
          localStorage.setItem('userPhone', freshUser.phone);
          if (freshUser.avatarUrl) {
            localStorage.setItem('userAvatar', freshUser.avatarUrl);
          } else {
            localStorage.removeItem('userAvatar');
          }
          localStorage.setItem('firebaseUid', authUser.uid);
        } else {
          // User is authenticated in Firebase, but no record in Firestore.
          // This is an inconsistent state. Log out the user.
          console.error("Authenticated user not found in Firestore. Logging out.");
          signOut(auth);
        }
      } else {
        // User is signed out
        setUser(null);
        // Clear localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('firebaseUid');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
