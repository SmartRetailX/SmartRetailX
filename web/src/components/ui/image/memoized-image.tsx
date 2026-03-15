/**
 * Higher-order component for memoizing optimized images
 */
import React, { useCallback, useEffect, useState } from 'react';

import { OptimizedImage } from '@/components/ui/image/optimized-image';

interface ImageCacheProps {
  src: string | File | null | undefined;
  alt?: string;
  width?: number;
  height?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string;
  quality?: 'low' | 'medium' | 'high';
  eager?: boolean;
  onClick?: () => void;
  srcSet?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

// LRU cache for managing object URLs - keeps most recently used entries
class LRUCache {
  private max: number;
  private cache: Map<string, string>;

  constructor(max = 100) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: string): string | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Move to the end of the map by deleting and re-adding
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }

    return undefined;
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.max) {
      // Remove the first (oldest) item
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: string): void {
    const url = this.cache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.forEach((url) => URL.revokeObjectURL(url));
    this.cache.clear();
  }
}

// Create an instance of the LRU cache
const imageCache = new LRUCache(50);

export const MemoizedImage: React.FC<ImageCacheProps> = ({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  width,
  height,
  objectFit = 'cover',
  fallbackSrc,
  quality = 'medium',
  eager = false,
  onClick,
  srcSet,
  sizes,
  loading = 'lazy',
  priority = false,
}) => {
  // State to store the processed source URL
  const [processedSrc, setProcessedSrc] = useState<string | File | null | undefined>(src);

  // Create a unique key for caching based on the source
  const getImageKey = useCallback((imgSrc: File | string | null | undefined): string => {
    if (!imgSrc) return 'null';
    if (typeof imgSrc === 'string') return imgSrc;
    return `${imgSrc.name}-${imgSrc.size}-${imgSrc.lastModified}`;
  }, []);

  // Process the image source with caching
  useEffect(() => {
    if (!src) {
      setProcessedSrc(null);
      return;
    }

    // For string URLs, we can use them directly
    if (typeof src === 'string') {
      setProcessedSrc(src);
      return;
    }

    // For File objects, use LRU cache for managing object URLs
    if (src instanceof File) {
      const imageKey = getImageKey(src);
      const cachedUrl = imageCache.get(imageKey);

      if (cachedUrl) {
        // Hit: Use the cached object URL
        setProcessedSrc(cachedUrl);
      } else {
        // Miss: Create a new object URL and cache it
        const objectUrl = URL.createObjectURL(src);
        imageCache.set(imageKey, objectUrl);
        setProcessedSrc(objectUrl);
      }
    }
  }, [src, getImageKey]);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const containerStyle: React.CSSProperties = {
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
  };

  // Map quality string to numeric values for the OptimizedImage
  const qualityValue =
    quality === 'low' ? 0.5 : quality === 'medium' ? 0.8 : quality === 'high' ? 0.95 : 0.8;

  // Determine effective loading strategy
  const effectiveLoading = priority ? 'eager' : loading;

  return (
    <div className={containerClassName} style={containerStyle} onClick={handleClick}>
      <OptimizedImage
        src={processedSrc}
        alt={alt}
        className={className}
        objectFit={objectFit}
        fallbackSrc={fallbackSrc}
        showLoader={!eager && !priority}
        compress={quality !== 'high'}
        quality={qualityValue}
        maxWidth={width ? width * 2 : 1200} // For higher pixel density screens
        srcSet={srcSet}
        sizes={sizes}
        loading={effectiveLoading}
      />
    </div>
  );
};
