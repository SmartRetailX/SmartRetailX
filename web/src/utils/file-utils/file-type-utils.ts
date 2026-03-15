// Map of MIME types to human-readable names
const MIME_TYPE_MAP: Record<string, string> = {
  'text/csv': 'CSV',
  'application/csv': 'CSV',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/json': 'JSON',
  'text/json': 'JSON',
  'text/plain': 'Text',
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'application/zip': 'ZIP',
  'application/xml': 'XML',
  'text/xml': 'XML',
};

// File extension to human-readable name map
const EXTENSION_MAP: Record<string, string> = {
  '.csv': 'CSV',
  '.xlsx': 'Excel',
  '.xls': 'Excel',
  '.json': 'JSON',
  '.txt': 'Text',
  '.pdf': 'PDF',
  '.jpg': 'JPG',
  '.jpeg': 'JPEG',
  '.png': 'PNG',
  '.gif': 'GIF',
  '.svg': 'SVG',
  '.zip': 'ZIP',
  '.xml': 'XML',
};

/**
 * Get human-readable file type from a File object
 */
export const fileTypeGetters = (file: File): string => {
  // First try MIME type
  const mimeType = file.type.toLowerCase();
  if (MIME_TYPE_MAP[mimeType]) {
    return MIME_TYPE_MAP[mimeType];
  }

  // Fallback to file extension
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  if (EXTENSION_MAP[extension]) {
    return EXTENSION_MAP[extension];
  }

  return 'Unknown';
};

/**
 * Get human-readable file type from a MIME type string
 */
export const getFileTypeFromMimeType = (mimeType: string): string => {
  const normalizedType = mimeType.toLowerCase();
  return MIME_TYPE_MAP[normalizedType] || 'Unknown';
};

/**
 * Get human-readable file types from an array of MIME types
 */
export const getFileTypesFromMimeTypes = (mimeTypes: string[]): string[] => {
  const uniqueTypes = new Set<string>();

  mimeTypes.forEach((mimeType) => {
    const fileType = getFileTypeFromMimeType(mimeType);
    if (fileType !== 'Unknown') {
      uniqueTypes.add(fileType);
    }
  });

  return Array.from(uniqueTypes).sort();
};

/**
 * Get a formatted string of file types from an array of MIME types
 */
export const getFormattedFileTypes = (mimeTypes: string[]): string => {
  const fileTypes = getFileTypesFromMimeTypes(mimeTypes);

  if (fileTypes.length === 0) {
    return 'Unknown file types';
  }

  if (fileTypes.length === 1) {
    return fileTypes[0];
  }

  if (fileTypes.length === 2) {
    return `${fileTypes[0]} and ${fileTypes[1]}`;
  }

  return `${fileTypes.slice(0, -1).join(', ')}, and ${fileTypes[fileTypes.length - 1]}`;
};

/**
 * Check if a file type is supported based on allowed MIME types
 */
export const isFileTypeSupported = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Get file extension from MIME type
 */
export const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeTypeToExtension: Record<string, string> = {
    'text/csv': '.csv',
    'application/csv': '.csv',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/json': '.json',
    'text/json': '.json',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'application/zip': '.zip',
    'application/xml': '.xml',
    'text/xml': '.xml',
  };

  return mimeTypeToExtension[mimeType.toLowerCase()] || '';
};

/**
 * Get all supported MIME types for a given file category
 */
export const getSupportedMimeTypes = (
  category: 'spreadsheet' | 'data' | 'image' | 'document' | 'all',
): string[] => {
  const categories = {
    spreadsheet: [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    data: [
      'text/csv',
      'application/csv',
      'application/json',
      'text/json',
      'text/plain',
      'application/xml',
      'text/xml',
    ],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'],
    document: ['application/pdf', 'text/plain'],
    all: Object.keys(MIME_TYPE_MAP),
  };

  return categories[category] || [];
};

/**
 * Validate file against multiple criteria
 */
export const validateFileComprehensive = (
  file: File,
  options: {
    allowedTypes?: string[];
    maxSizeMB?: number;
    minSizeMB?: number;
    allowedExtensions?: string[];
  },
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { allowedTypes, maxSizeMB, minSizeMB, allowedExtensions } = options;

  // Type validation
  if (allowedTypes && !isFileTypeSupported(file, allowedTypes)) {
    const formattedTypes = getFormattedFileTypes(allowedTypes);
    errors.push(`File type not supported. Allowed types: ${formattedTypes}`);
  }

  // Size validation
  if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
    errors.push(`File size must be less than ${maxSizeMB}MB`);
  }

  if (minSizeMB && file.size < minSizeMB * 1024 * 1024) {
    errors.push(`File size must be at least ${minSizeMB}MB`);
  }

  // Extension validation
  if (allowedExtensions) {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(
        `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get file category based on MIME type
 */
export const getFileCategory = (
  file: File,
): 'spreadsheet' | 'data' | 'image' | 'document' | 'unknown' => {
  const mimeType = file.type.toLowerCase();

  if (
    [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(mimeType)
  ) {
    return 'spreadsheet';
  }

  if (
    ['application/json', 'text/json', 'text/plain', 'application/xml', 'text/xml'].includes(
      mimeType,
    )
  ) {
    return 'data';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (['application/pdf'].includes(mimeType)) {
    return 'document';
  }

  return 'unknown';
};

/**
 * Generate accept attribute string for HTML file inputs
 */
export const generateAcceptAttribute = (allowedTypes: string[]): string => {
  const extensions = allowedTypes.map((type) => getExtensionFromMimeType(type)).filter(Boolean);

  const mimeTypes = allowedTypes.filter((type) => !getExtensionFromMimeType(type));

  return [...extensions, ...mimeTypes].join(',');
};

/**
 * Check if file is likely to be corrupted based on size and type
 */
export const isFileLikelyCorrupted = (file: File): boolean => {
  // Very small files for certain types might be corrupted
  const suspiciouslySmallSizes = {
    'application/vnd.ms-excel': 1024, // 1KB
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 1024,
    'application/pdf': 1024,
    'image/jpeg': 500,
    'image/png': 500,
  };

  const minSize = suspiciouslySmallSizes[file.type as keyof typeof suspiciouslySmallSizes];
  return minSize ? file.size < minSize : false;
};
