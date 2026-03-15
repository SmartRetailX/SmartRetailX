import {
  RoyaltyUploadSummaryContractResponse,
  RoyaltyUploadSummaryCountryResponse,
  RoyaltyUploadSummaryDspResponse,
  RoyaltyUploadSummaryOverviewResponse,
  RoyaltyUploadSummaryPayeeResponse,
} from '@/schemas/response-validation/royalty-upload-summary.response';
import { RoyaltyUploadSummaryByType, RoyaltyUploadSummaryType } from '@/types/royalty';

type AnySummaryResponse =
  | RoyaltyUploadSummaryOverviewResponse
  | RoyaltyUploadSummaryContractResponse
  | RoyaltyUploadSummaryDspResponse
  | RoyaltyUploadSummaryCountryResponse
  | RoyaltyUploadSummaryPayeeResponse;

const unwrapData = <T>(response: T | { data: T }): T => {
  if (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    Object.keys(response).length === 1
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
};

export const mapRoyaltyUploadSummary = <T extends RoyaltyUploadSummaryType | undefined>(
  response: AnySummaryResponse,
): RoyaltyUploadSummaryByType<T> => {
  return unwrapData(response) as RoyaltyUploadSummaryByType<T>;
};
