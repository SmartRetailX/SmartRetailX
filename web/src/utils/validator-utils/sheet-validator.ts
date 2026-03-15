import { FileStatus } from '@/constants/file';

export function compareTemplateMaps(
  template: Record<string, string> | null,
  headers: Record<string, string> | undefined,
): { matches: boolean; mismatches: string[] } {
  if (!template || !headers) {
    // No template or headers to compare
    if (!template) {
      return { matches: false, mismatches: ['No template selected for this file'] };
    }
    return { matches: false, mismatches: ['No headers found in file'] };
  }

  const mismatches: string[] = [];

  for (const [fieldName, templateValue] of Object.entries(template)) {
    const trimmedValue = templateValue.trim();

    // Parse the template value: "I-ISRC" => columnKey="I", expectedHeader="ISRC"
    const hyphenIndex = trimmedValue.indexOf('-');

    if (hyphenIndex === -1) {
      // No hyphen found, treat the whole value as expected header
      mismatches.push(
        `Invalid template format for field "${fieldName}": "${templateValue}" (expected format: "Column-Header")`,
      );
      continue;
    }

    const columnKey = trimmedValue.substring(0, hyphenIndex).trim();
    const expectedHeader = trimmedValue.substring(hyphenIndex + 1).trim();

    // Check if the column exists in headers
    if (!(columnKey in headers)) {
      mismatches.push(
        `Missing column: "${columnKey}" (for field: ${fieldName}, expected header: "${expectedHeader}")`,
      );
      continue;
    }

    // Check if the header value matches
    const actualHeader = headers[columnKey].trim();
    const normalizedActual = actualHeader.toLowerCase();
    const normalizedExpected = expectedHeader.toLowerCase();

    if (normalizedActual !== normalizedExpected) {
      mismatches.push(
        `Column "${columnKey}" header mismatch: expected "${expectedHeader}", got "${actualHeader}" (for field: ${fieldName})`,
      );
    }
  }

  return { matches: mismatches.length === 0, mismatches };
}

// Get status text
export const getStatusText = (status: FileStatus) => {
  switch (status) {
    case FileStatus.Pending:
      return 'Waiting to parse...';
    case FileStatus.Parsing:
      return 'Parsing file...';
    case FileStatus.Validating:
      return 'Validating template...';
    case FileStatus.Success:
      return 'Ready to process. Please recheck before start processing.';
    case FileStatus.Error:
      return 'Validation failed';
    default:
      return '';
  }
};
