'use client';

import { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  className?: string;
}

// Generic lazy wrapper for components
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T> & LazyWrapperProps) {
    const { fallback: customFallback, className, ...componentProps } = props;
    
    const defaultFallback = (
      <div className={className}>
        <Skeleton className="w-full h-32 rounded-lg" />
      </div>
    );
    
    return (
      <Suspense fallback={customFallback || fallback || defaultFallback}>
        <LazyComponent {...componentProps} />
      </Suspense>
    );
  };
}

// Specific lazy components for heavy imports
export const LazyEmojiPicker = createLazyComponent(
  () => import('emoji-picker-react'),
  <Skeleton className="w-80 h-96 rounded-lg" />
);

export const LazyChart = createLazyComponent(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  <Skeleton className="w-full h-64 rounded-lg" />
);

// Intersection Observer Hook for lazy loading
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
}: UseIntersectionObserverProps = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        
        if (isVisible && (!triggerOnce || !hasTriggered)) {
          setIsIntersecting(true);
          if (triggerOnce) {
            setHasTriggered(true);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(isVisible);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { ref, isIntersecting };
}

// Lazy load component that only renders when in view
interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export function LazyLoad({
  children,
  fallback,
  className,
  threshold = 0.1,
  rootMargin = '50px',
}: LazyLoadProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : (fallback || <Skeleton className="w-full h-32" />)}
    </div>
  );
}
