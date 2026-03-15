/**
 * Image utility functions for optimizing image loading and handling
 */

// Image loading performance tracking
interface ImageLoadStats {
  successes: number;
  failures: number;
  compressionTimeTotal: number;
  compressionCount: number;
  loadTimeTotal: number;
  loadCount: number;
}

// Stats tracking object
const imageStats: ImageLoadStats = {
  successes: 0,
  failures: 0,
  compressionTimeTotal: 0,
  compressionCount: 0,
  loadTimeTotal: 0,
  loadCount: 0,
};

/**
 * Track image load performance
 * @param loadTime Time taken to load the image in ms
 * @param success Whether the load was successful
 */
export const trackImageLoad = (loadTime: number, success: boolean) => {
  if (success) {
    imageStats.successes++;
    imageStats.loadTimeTotal += loadTime;
    imageStats.loadCount++;
  } else {
    imageStats.failures++;
  }
};

/**
 * Get image loading statistics
 * @returns Current image loading statistics
 */
export const getImageStats = (): ImageLoadStats & {
  avgLoadTime: number;
  avgCompressionTime: number;
  failureRate: number;
} => {
  return {
    ...imageStats,
    avgLoadTime: imageStats.loadCount > 0 ? imageStats.loadTimeTotal / imageStats.loadCount : 0,
    avgCompressionTime:
      imageStats.compressionCount > 0
        ? imageStats.compressionTimeTotal / imageStats.compressionCount
        : 0,
    failureRate: imageStats.failures / (imageStats.successes + imageStats.failures) || 0,
  };
};

/**
 * Creates a safe object URL for a file and cleans up properly to prevent memory leaks
 * @param file File to create URL for
 * @returns Object with the URL and a cleanup function
 */
export const createSafeObjectUrl = (file: File | Blob) => {
  const url = URL.createObjectURL(file);

  return {
    url,
    revoke: () => {
      URL.revokeObjectURL(url);
    },
  };
};

/**
 * Default placeholder image to use when image loading fails
 */
export const DEFAULT_PLACEHOLDER_IMAGE = '/assets/placeholder-image.svg';

/**
 * Loads an image and returns a promise that resolves when the image is loaded
 * @param src Image source URL
 * @returns Promise that resolves when image is loaded or rejects on error
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const img = new Image();

    img.onload = () => {
      const loadTime = performance.now() - startTime;
      trackImageLoad(loadTime, true);
      resolve(img);
    };

    img.onerror = () => {
      trackImageLoad(0, false);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
};

/**
 * Preloads a collection of images
 * @param urls Array of image URLs to preload
 * @param options Options for preloading
 * @returns Promise that resolves when all images are loaded, with an array of results
 */
export const preloadImages = async (
  urls: string[],
  options: {
    concurrency?: number; // How many images to load at once
    timeout?: number; // Timeout in ms for each image load
    onProgress?: (loaded: number, total: number) => void;
  } = {},
) => {
  const { concurrency = 5, timeout = 10000, onProgress } = options;

  // Results array to track success/failure of each image
  const results: Array<{ url: string; success: boolean; error?: Error }> = [];

  // Queue of URLs to process
  const queue = [...urls];
  let completedCount = 0;

  // Function to load a single image with timeout
  const loadWithTimeout = async (url: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Use the existing preloadImage function
      await preloadImage(url);

      clearTimeout(timeoutId);
      results.push({ url, success: true });
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    completedCount++;
    onProgress?.(completedCount, urls.length);

    // Process next image in queue if any remain
    if (queue.length > 0) {
      const nextUrl = queue.shift();
      if (nextUrl) await loadWithTimeout(nextUrl);
    }
  };

  // Start initial batch of image loads
  const initialBatch = queue.splice(0, concurrency);
  await Promise.all(initialBatch.map((url) => loadWithTimeout(url)));

  return results;
};

/**
 * Handles image load errors with fallback options
 * @param event Error event from image
 * @param fallbackSrc Optional fallback source to use
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_PLACEHOLDER_IMAGE,
) => {
  const imgElement = event.currentTarget;

  // Prevent infinite error loops
  imgElement.onerror = null;

  // Apply fallback image
  imgElement.src = fallbackSrc;

  // Add a class to indicate fallback is used
  imgElement.classList.add('bg-gray-200');
};

/**
 * Cache of image dimensions to avoid recomputing
 */
const imageDimensionsCache = new Map<string, { width: number; height: number }>();

/**
 * Gets the dimensions of an image
 * @param src Image source URL or File
 * @returns Promise that resolves to image dimensions or null if loading fails
 */
export const getImageDimensions = async (
  src: string | File,
): Promise<{ width: number; height: number } | null> => {
  try {
    // Create a URL from the source if it's a File
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);

    // Check if dimensions are already in the cache
    if (typeof src === 'string' && imageDimensionsCache.has(src)) {
      return imageDimensionsCache.get(src)!;
    }

    // Create a new image and wait for it to load
    const img = await preloadImage(url);

    // Get dimensions
    const dimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };

    // Cache dimensions for string URLs
    if (typeof src === 'string') {
      imageDimensionsCache.set(src, dimensions);
    } else {
      // Clean up the object URL if the source was a File
      URL.revokeObjectURL(url);
    }

    return dimensions;
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    return null;
  }
};

/**
 * Compresses an image file to reduce size while maintaining reasonable quality
 * @param file The image file to compress
 * @param maxWidth Maximum width of the compressed image (preserves aspect ratio)
 * @param quality Compression quality (0-1)
 * @returns Promise with the compressed image as a Blob
 */
export const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
  // Create a URL for the image
  const objectUrl = URL.createObjectURL(file);
  const startTime = performance.now();

  try {
    // Load the image
    const img = await preloadImage(objectUrl);

    // Get the original dimensions
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    // Calculate new dimensions while preserving aspect ratio
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.floor((originalHeight / originalWidth) * maxWidth);
    }

    // Create a canvas with the new dimensions
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw the image on the canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Get the compressed image as a Blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Track compression time
            const compressionTime = performance.now() - startTime;
            imageStats.compressionTimeTotal += compressionTime;
            imageStats.compressionCount++;

            // Log reduction in size
            const compressionRatio = blob.size / file.size;
            console.debug(
              `Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB ` +
                `(${(compressionRatio * 100).toFixed(1)}%, saved ${((1 - compressionRatio) * 100).toFixed(1)}%)`,
            );

            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality,
      );
    });
  } finally {
    // Clean up the object URL
    URL.revokeObjectURL(objectUrl);
  }
};
