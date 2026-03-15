import {
  CONTRACT_ANOMALY_LABELS,
  ContractAnomalyType,
  PAYEE_ANOMALY_LABELS,
  PayeeAnomalyType,
} from '@/constants/anomalies';

export const getAnomalyLabel = (type: ContractAnomalyType | PayeeAnomalyType) => {
  if (type in CONTRACT_ANOMALY_LABELS) {
    return CONTRACT_ANOMALY_LABELS[type as ContractAnomalyType];
  }

  if (type in PAYEE_ANOMALY_LABELS) {
    return PAYEE_ANOMALY_LABELS[type as PayeeAnomalyType];
  }

  return type.replace(/_/g, ' '); // Fallback: Replace underscores with spaces
};
