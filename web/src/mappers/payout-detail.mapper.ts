import {
  PayoutApiResponse,
  PayoutStatementApiResponse,
} from '@/schemas/response-validation/payout-detail.response';
import { Contract } from '@/types/contract';
import { Payout, PayoutStatement } from '@/types/payout';
import { Transaction } from '@/types/transaction';
import { parseIsoToDate } from '@/utils/parsers';

function mapPayoutStatement(statement: PayoutStatementApiResponse): PayoutStatement {
  return {
    _id: statement._id,
    originalName: statement.originalName || statement.fileName || 'statement.pdf',
    mimeType: statement.mimeType,
    size: statement.size,
    key: statement.key || statement.fileKey || '',
    tags: statement.tags ?? [],
    uploadedBy: statement.uploadedBy,
    createdAt: parseIsoToDate(statement.createdAt),
    updatedAt: parseIsoToDate(statement.updatedAt),
  };
}

export function mapPayoutFromApi(response: PayoutApiResponse): Payout {
  return {
    _id: response._id,
    identifier: response.identifier,
    opening_balance: response.opening_balance,
    gross_earnings: response.gross_earnings,
    total_expenses: response.total_expenses,
    payout_amount: response.payout_amount,
    payee: response.payee as Payout['payee'],
    payeeName: response.payeeName,
    payeeEmail: response.payeeEmail,
    status: response.status,
    rolledPayouts: response.rolledPayouts,
    version: response.version,
    reason: response.reason,
    createdBy: {
      _id: response.createdBy._id,
      email: response.createdBy.email ?? '',
    },
    updatedBy: {
      _id: response.updatedBy._id,
      email: response.updatedBy.email ?? '',
    },
    createdAt: parseIsoToDate(response.createdAt) ?? new Date(response.createdAt),
    updatedAt: parseIsoToDate(response.updatedAt) ?? new Date(response.updatedAt),
    contracts: response.contracts as unknown as Contract[],
    transactions: response.transactions as unknown as Transaction[],
    statement:
      response.statement === null
        ? null
        : response.statement
          ? mapPayoutStatement(response.statement)
          : undefined,
  };
}

export function mapPayoutsFromApi(response: PayoutApiResponse[]): Payout[] {
  return response.map(mapPayoutFromApi);
}
