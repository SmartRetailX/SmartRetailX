import { PayoutGroupType } from '@/types/payout';

export const getGroupTypeLabel = (type: PayoutGroupType) => {
  switch (type) {
    case PayoutGroupType.COUNTRY:
      return 'Country';
    case PayoutGroupType.CURRENCY:
      return 'Currency';
    case PayoutGroupType.AMOUNT:
      return 'Amount Range';
    case PayoutGroupType.CUSTOM:
      return 'Custom Payees';
    default:
      return type;
  }
};
