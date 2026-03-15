import {
  PayoutGroupByIdResponse,
  PayoutGroupResponse,
  PayoutGroupsResponse,
} from '@/schemas/response-validation/payout-group.response';
import { IPayoutGroup, IPayoutGroupPopulated, PayoutGroupType } from '@/types/payout';

function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
}

/**
 * Shared base mapping logic for payout group responses
 */
function mapBasePayoutGroup<T extends PayoutGroupResponse | PayoutGroupByIdResponse>(response: T) {
  return {
    id: response._id,
    type: response.type,
    name: response.name,
    isActive: response.isActive ?? false,
    createdAt: new Date(response.createdAt),
    updatedAt: new Date(response.updatedAt),
    createdBy: {
      id: response.createdBy._id,
      email: response.createdBy.email,
      name: response.createdBy.name || 'No name provided',
    },
    updatedBy: {
      id: response.updatedBy._id,
      email: response.updatedBy.email,
      name: response.updatedBy.name || 'No name provided',
    },
  };
}

/**
 * Maps a single payout group response from API to domain model
 * Converts ISO date strings to Date objects
 */
export function mapPayoutGroup(response: PayoutGroupResponse): IPayoutGroup {
  const base = mapBasePayoutGroup(response);

  // Switches for conditional fields based on type
  switch (response.type) {
    case PayoutGroupType.COUNTRY:
      return {
        ...base,
        type: PayoutGroupType.COUNTRY,
        countryValues: response.values,
      } as IPayoutGroup;

    case PayoutGroupType.CURRENCY:
      return {
        ...base,
        type: PayoutGroupType.CURRENCY,
        currencyValues: response.values,
      } as IPayoutGroup;

    case PayoutGroupType.AMOUNT: {
      // Optionally validate / coerce range numbers
      const range = response.range && {
        from: typeof response.range.from === 'number' ? response.range.from : undefined,
        to: typeof response.range.to === 'number' ? response.range.to : undefined,
      };

      return {
        ...base,
        type: PayoutGroupType.AMOUNT,
        range,
      } as IPayoutGroup;
    }

    case PayoutGroupType.CUSTOM:
      return {
        ...base,
        type: PayoutGroupType.CUSTOM,
        payeeIds: response.payeeIds,
      } as IPayoutGroup;

    default:
      return assertNever(response.type as never);
  }
}

/**
 * Maps array of payout group responses to domain models
 */
export function mapPayoutGroups(response: PayoutGroupsResponse): IPayoutGroup[] {
  return response.map(mapPayoutGroup);
}

/**
 * Maps a single payout group by ID response (with populated payees) to domain model
 */
export function mapPayoutGroupById(response: PayoutGroupByIdResponse): IPayoutGroupPopulated {
  const base = mapBasePayoutGroup(response);

  switch (response.type) {
    case PayoutGroupType.COUNTRY:
      return {
        ...base,
        type: PayoutGroupType.COUNTRY,
        countryValues: response.values,
      } as IPayoutGroupPopulated;

    case PayoutGroupType.CURRENCY:
      return {
        ...base,
        type: PayoutGroupType.CURRENCY,
        currencyValues: response.values,
      } as IPayoutGroupPopulated;

    case PayoutGroupType.AMOUNT: {
      const range = response.range && {
        from: typeof response.range.from === 'number' ? response.range.from : undefined,
        to: typeof response.range.to === 'number' ? response.range.to : undefined,
      };

      return {
        ...base,
        type: PayoutGroupType.AMOUNT,
        range,
      } as IPayoutGroupPopulated;
    }

    case PayoutGroupType.CUSTOM:
      return {
        ...base,
        type: PayoutGroupType.CUSTOM,
        payees:
          response.payeeIds?.map((payee) => ({
            id: payee._id,
            email: payee.email || 'No email provided',
            name: payee.name || 'No name provided',
            image: payee.image,
          })) ?? [],
      } as IPayoutGroupPopulated;

    default:
      return assertNever(response.type as never);
  }
}
