export const ROYALTY_IMPORT_STATUS = {
  PENDING: 'pending',
  VALIDATING: 'validating',
  READING_DATA: 'reading-data',
  SAVING_ROYALTIES: 'saving-royalties',
  CALCULATING_EXPENSES: 'calculating-expenses',
  FINISHING: 'finishing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REVERTED: 'reverted',
} as const;
