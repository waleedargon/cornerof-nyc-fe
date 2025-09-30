'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Neighborhood } from '@/lib/types';
import type { SimpleSelectOption } from '@/components/ui/simple-select';

export function useNeighborhoods() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'neighborhoods'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const neighborhoodsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Neighborhood[];
        setNeighborhoods(neighborhoodsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching neighborhoods:', err);
        setError('Failed to fetch neighborhoods');
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborhoods();
  }, []);

  // Convert to SimpleSelectOption format
  const neighborhoodOptions: SimpleSelectOption[] = neighborhoods.map(neighborhood => ({
    value: neighborhood.name,
    label: neighborhood.name,
    description: neighborhood.description || undefined,
  }));

  return {
    neighborhoods,
    neighborhoodOptions,
    loading,
    error,
  };
}
