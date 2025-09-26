'use client';

import { useEffect } from 'react';
import { onCLS, onFID, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

// Performance monitoring component
export function WebVitals() {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    const sendToAnalytics = (metric: Metric) => {
      // Send to your analytics service
      // Example: Google Analytics 4
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_category: 'Web Vitals',
          event_label: metric.id,
          non_interaction: true,
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Web Vital:', metric);
      }
    };

    // Measure Core Web Vitals
    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);

  return null; // This component doesn't render anything
}

// Hook for measuring custom performance metrics
export function usePerformanceMonitor(name: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log performance metric
      if (process.env.NODE_ENV === 'development') {
        console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && 'gtag' in window) {
        (window as any).gtag('event', 'timing_complete', {
          name: name,
          value: Math.round(duration),
          event_category: 'Performance',
        });
      }
    };
  }, [name]);
}

// Component for measuring render time
export function PerformanceWrapper({ 
  name, 
  children 
}: { 
  name: string; 
  children: React.ReactNode;
}) {
  usePerformanceMonitor(name);
  return <>{children}</>;
}
