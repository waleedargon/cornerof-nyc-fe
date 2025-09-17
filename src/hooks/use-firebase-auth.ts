'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface FirebaseAuthState {
  user: User | null;
  loading: boolean;
}

export function useFirebaseAuth() {
  const [authState, setAuthState] = useState<FirebaseAuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState({
        user,
        loading: false,
      });
    });

    return () => unsubscribe();
  }, []);

  return authState;
}
