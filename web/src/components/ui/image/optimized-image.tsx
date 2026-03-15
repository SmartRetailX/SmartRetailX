import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { compressImage, DEFAULT_PLACEHOLDER_IMAGE, handleImageError } from '@/utils/image-utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> {
  src: string | File | null | undefined;
  fallbackSrc?: string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  showLoader?: boolean;
  compress?: boolean;
  maxWidth?: number;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage component with lazy loading, error handling, and loading state
 */
export const OptimizedImage = ({
  src,
  alt = '',
  className,
  fallbackSrc = DEFAULT_PLACEHOLDER_IMAGE,
  aspectRatio,
  objectFit = 'cover',
  showLoader = true,
  compress = false,
  maxWidth = 1200,
  quality = 0.8,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState<string>('');
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up any created object URLs when component unmounts or src changes
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    setIsLoading(true);

    if (!src) {
      setImgSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    const processImage = async () => {
      try {
        // Handle File objects by creating an object URL
        if (src instanceof File) {
          // Clean up previous object URL
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }

          // Compress the image if enabled
          if (compress) {
            try {
              const compressedBlob = await compressImage(src, maxWidth, quality);
              const objectUrl = URL.createObjectURL(compressedBlob);
              objectUrlRef.current = objectUrl;
              setImgSrc(objectUrl);
            } catch (error) {
              console.error('Image compression failed:', error);
              // Fallback to uncompressed image if compression fails
              const objectUrl = URL.createObjectURL(src);
              objectUrlRef.current = objectUrl;
              setImgSrc(objectUrl);
            }
          } else {
            const objectUrl = URL.createObjectURL(src);
            objectUrlRef.current = objectUrl;
            setImgSrc(objectUrl);
          }
        } else if (typeof src === 'string') {
          setImgSrc(src);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setImgSrc(fallbackSrc);
        onError?.();
      }
    };

    processImage();
  }, [src, fallbackSrc, compress, maxWidth, quality, onError]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleErrorEvent = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleImageError(e, fallbackSrc);
    setIsLoading(false);
    onError?.();
  };

  // Style based on aspect ratio if provided
  const containerStyle: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  return (
    <div className={cn('relative overflow-hidden', className)} style={containerStyle}>
      {isLoading && showLoader && <Skeleton className='absolute inset-0 z-10' />}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            `object-${objectFit}`,
          )}
          loading={props.loading || 'lazy'}
          decoding={props.decoding || 'async'}
          onLoad={handleLoad}
          onError={handleErrorEvent}
          sizes={props.sizes}
          srcSet={props.srcSet}
          fetchPriority={props.fetchPriority}
          {...props}
        />
      )}
    </div>
  );
};
