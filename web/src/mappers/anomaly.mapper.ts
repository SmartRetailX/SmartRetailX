import {
  ContractAnomalyCountResponse,
  ContractAnomalyListResponse,
  ContractAnomalyResponse,
  PayeeAnomalyCountResponse,
  PayeeAnomalyListResponse,
  PayeeAnomalyResponse,
} from '@/schemas/response-validation/anomaly.response';
import {
  ContractAnomaly,
  ContractAnomalyCount,
  PayeeAnomaly,
  PayeeAnomalyCount,
} from '@/types/anomaly';
import { PaginationApiResponse } from '@/types/api';

// ------------------------------------------------------------------
// Anomaly Counts
// ------------------------------------------------------------------
export function mapContractAnomalyCount(
  response: ContractAnomalyCountResponse,
): ContractAnomalyCount {
  return {
    groups: response.byType.map((group) => ({
      type: group.type,
      count: group.count,
    })),
    total: response.totalCount,
  };
}

export function mapPayeeAnomalyCount(response: PayeeAnomalyCountResponse): PayeeAnomalyCount {
  return {
    groups: response.byType.map((group) => ({
      type: group.type,
      count: group.count,
    })),
    total: response.totalCount,
  };
}

// ------------------------------------------------------------------
// Anomalies
// ------------------------------------------------------------------

// Contracts
function mapContractAnomaly(response: ContractAnomalyResponse[]): ContractAnomaly[] {
  return response.map((item) => ({
    contract: {
      id: item.contract._id,
      isrc: item.contract.isrc ?? null,
      catalogNumber: item.contract.catalogNo ?? '',
      payees: item.contract.payees,
      releaseDate: item.contract.releaseDate ?? null,
      releaseTitle: item.contract.releaseTitle ?? null,
      title: item.contract.title,
      upc: item.contract.upc ?? null,
      version: item.contract.version ?? null,
    },
    types: item.anomalyTypes,
  }));
}

export function mapContractAnomalyResponse(
  response: ContractAnomalyListResponse,
): PaginationApiResponse<ContractAnomaly> {
  return {
    data: mapContractAnomaly(response.data),
    total: response.total,
  };
}

// Payees
function mapPayeeAnomaly(response: PayeeAnomalyResponse[]): PayeeAnomaly[] {
  return response.map((item) => ({
    payee: {
      id: item.payee._id,
      name: item.payee.name,
      isHidden: item.payee.isHidden ?? false,
      sourceId: item.payee.meta.sourceId,
      aliases: item.payee.aliases,
      internalPayee: item.payee.internalPayee,
      email: item.payee.email,
      type: item.payee.type,
    },
    types: item.anomalyTypes,
  }));
}

export function mapPayeeAnomalyResponse(
  response: PayeeAnomalyListResponse,
): PaginationApiResponse<PayeeAnomaly> {
  return {
    data: mapPayeeAnomaly(response.data),
    total: response.total,
  };
}
