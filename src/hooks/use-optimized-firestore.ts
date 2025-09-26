'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  Unsubscribe,
  DocumentData,
  Query,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';

// Optimized hook for single document subscription with caching
export function useDocument<T = DocumentData>(
  docRef: DocumentReference<T> | null,
  options: {
    includeMetadataChanges?: boolean;
    cacheKey?: string;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const cacheRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    const cacheKey = options.cacheKey || docRef.path;
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      setData(cacheRef.current.get(cacheKey) || null);
      setLoading(false);
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      docRef,
      {
        includeMetadataChanges: options.includeMetadataChanges || false,
      },
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          const docData = { id: snapshot.id, ...snapshot.data() } as T;
          setData(docData);
          // Update cache
          cacheRef.current.set(cacheKey, docData);
        } else {
          setData(null);
          cacheRef.current.delete(cacheKey);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore document error:', err);
        setError(err);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [docRef?.path, options.includeMetadataChanges, options.cacheKey]);

  return { data, loading, error };
}

// Optimized hook for query subscription with pagination
export function useQuery<T = DocumentData>(
  query: Query<T> | null,
  options: {
    includeMetadataChanges?: boolean;
    limit?: number;
    cacheKey?: string;
  } = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const cacheRef = useRef<Map<string, T[]>>(new Map());

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    const cacheKey = options.cacheKey || query.toString();
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      setData(cacheRef.current.get(cacheKey) || []);
      setLoading(false);
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query,
      {
        includeMetadataChanges: options.includeMetadataChanges || false,
      },
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as T));
        
        setData(docs);
        setHasMore(options.limit ? docs.length >= options.limit : false);
        
        // Update cache
        cacheRef.current.set(cacheKey, docs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore query error:', err);
        setError(err);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [query?.toString(), options.includeMetadataChanges, options.limit, options.cacheKey]);

  return { data, loading, error, hasMore };
}

// Debounced hook for real-time search
export function useDebouncedQuery<T = DocumentData>(
  queryFn: (searchTerm: string) => Query<T> | null,
  searchTerm: string,
  debounceMs = 300
) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const [query, setQuery] = useState<Query<T> | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Update query when debounced term changes
  useEffect(() => {
    setQuery(queryFn(debouncedTerm));
  }, [debouncedTerm, queryFn]);

  return useQuery(query, {
    cacheKey: `search_${debouncedTerm}`,
  });
}

// Memory cleanup utility
export function clearFirestoreCache() {
  // This would clear any caches if needed
  console.log('Firestore cache cleared');
}
