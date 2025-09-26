'use client';

import { useState, forwardRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  title?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    width,
    height,
    fill = false,
    className,
    priority = false,
    placeholder = 'empty',
    blurDataURL,
    sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
    quality = 85,
    title,
    onLoad,
    onError,
  }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = () => {
      setIsLoading(false);
      onLoad?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    };

    if (hasError) {
      return (
        <div 
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground',
            fill ? 'absolute inset-0' : 'w-full h-full',
            className
          )}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className={cn('relative overflow-hidden', !fill && 'w-full h-full')}>
        {isLoading && (
          <div 
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-muted animate-pulse',
              fill ? 'absolute inset-0' : 'w-full h-full'
            )}
          >
            <div className="w-8 h-8 bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        )}
        <Image
          ref={ref}
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          title={title}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          quality={quality}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
