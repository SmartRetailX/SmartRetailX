export type CSVData = Record<string, string>;

export type ValidationOptions = {
  validateIndex?: boolean;
};

/**
 * Validates required CSV fields and optionally enforces exact column order.
 */
export const validateCSVFields = (
  requiredFields: string[],
  data: CSVData[],
  options?: ValidationOptions,
): string | string[] | null => {
  if (!data.length) return 'No data found';

  // Trim column names 1st space to avoid issues with extra spaces
  const columns = Object.values(data[0]).map((col) => col.trim());

  // 1. Basic field existence check
  const missingFields = getMissingFields(requiredFields, columns);
  if (missingFields.length > 0) {
    return missingFields;
  }

  // 2. Optional strict index check
  if (options?.validateIndex) {
    const indexError = validateStrictColumnOrder(requiredFields, columns);
    if (indexError) return indexError;
  }

  return null;
};

// --- Helpers ---

function getMissingFields(required: string[], columns: string[]): string[] {
  return required
    .filter((field) => {
      return !columns.includes(field);
    })
    .map((field) => `Required field "${field}" is missing from the CSV.`);
}

function validateStrictColumnOrder(
  requiredFields: string[],
  actualColumns: string[],
): string | null {
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    const actual = actualColumns[i];

    if (field !== actual) {
      return `Column ${i + 1} expected "${field}", but got "${actual}"`;
    }
  }

  return null;
}
