export const CONTRACT_ANOMALY_TYPES = {
  NO_PAYEES: 'no_payees',
  INVALID_ISRC: 'invalid_isrc',
  INVALID_SPLITS: 'invalid_splits',
  MISSING_RELEASE_TITLE: 'missing_release_title',
  DUPLICATE_ISRC: 'duplicate_isrc',
  INVALID_SPLIT_RANGE: 'invalid_split_range',
} as const;

export const PAYEE_ANOMALY_TYPES = {
  MISSING_EMAIL: 'missing_email',
  DUPLICATE_NAME: 'duplicate_name',
  DUPLICATE_EMAIL: 'duplicate_email',
} as const;

export type ContractAnomalyType =
  (typeof CONTRACT_ANOMALY_TYPES)[keyof typeof CONTRACT_ANOMALY_TYPES];

export type PayeeAnomalyType = (typeof PAYEE_ANOMALY_TYPES)[keyof typeof PAYEE_ANOMALY_TYPES];

// Mapping of anomaly types to human-readable labels
export const CONTRACT_ANOMALY_LABELS: Record<ContractAnomalyType, string> = {
  no_payees: 'No Payees',
  invalid_isrc: 'Invalid ISRC',
  invalid_splits: 'Invalid Splits',
  missing_release_title: 'Missing Release Title',
  duplicate_isrc: 'Duplicate ISRC',
  invalid_split_range: 'Invalid Split Range',
};

export const PAYEE_ANOMALY_LABELS: Record<PayeeAnomalyType, string> = {
  missing_email: 'Missing Email',
  duplicate_name: 'Duplicate Name',
  duplicate_email: 'Duplicate Email',
};
