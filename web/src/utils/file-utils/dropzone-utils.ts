export const validateDropzoneFileType = (extension: string, mimeType: string): string => {
  if (!extension) return 'Invalid file type';

  // Normalize extension to lowercase
  extension = extension.toLowerCase();

  // Map extensions to MIME types
  switch (extension) {
    case 'csv':
      if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
        return 'text/csv';
      }
      break;
    // case 'xlsx':
    // case 'xls':
    //   if (
    //     mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    //     mimeType === 'application/vnd.ms-excel'
    //   ) {
    //     return mimeType;
    //   }
    //   break;
    // case 'json':
    //   if (mimeType === 'application/json') {
    //     return 'application/json';
    //   }
    //   break;
    // case 'txt':
    //   if (mimeType === 'text/plain') {
    //     return 'text/plain';
    //   }
    //   break;
  }

  // If we get here, the file type wasn't valid
  throw new Error(`Invalid file type. Expected ${extension.toUpperCase()} file.`);
};
