'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vibe } from '@/lib/types';
import type { SimpleSelectOption } from '@/components/ui/simple-select';

export function useVibes() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVibes = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'vibes'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const vibesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Vibe[];
        setVibes(vibesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching vibes:', err);
        setError('Failed to fetch vibes');
      } finally {
        setLoading(false);
      }
    };

    fetchVibes();
  }, []);

  // Convert to SimpleSelectOption format with fallback data for testing
  const vibeOptions: SimpleSelectOption[] = vibes.length > 0 
    ? vibes.map(vibe => ({
        value: vibe.name,
        label: vibe.name,
        description: vibe.description || undefined,
      }))
    : [
        // Fallback test data
        { value: "Chill", label: "Chill" },
        { value: "Party", label: "Party" },
        { value: "Foodie", label: "Foodie" },
        { value: "Artsy", label: "Artsy" },
        { value: "Outdoorsy", label: "Outdoorsy" },
      ];

  return {
    vibes,
    vibeOptions,
    loading,
    error,
  };
}
