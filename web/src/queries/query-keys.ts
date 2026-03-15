import { createQueryKeys } from '@/utils/query-key-factory';

// Auth Keys
export const authKeys = createQueryKeys('auth');

// Organization Keys
export const organizationApplicationsKey = createQueryKeys('organizationApplications');

// User Keys
export const userKeys = createQueryKeys('users');

// Royalty uploads/ import query keys
export const royaltyUploadsKeys = createQueryKeys('royalty-uploads');

// Chat Keys
export const chatKeys = createQueryKeys('chats');
export const threadItemKeys = createQueryKeys('threadItems');

// Distro Keys
export const distroKeys = createQueryKeys('distros');
export const distroTemplatesKeys = createQueryKeys('distro-templates');

// Ticket Keys
export const ticketKeys = createQueryKeys('tickets');
export const ticketCategoryKeys = createQueryKeys('ticketCategories');

// Payout Keys
export const payoutKeys = createQueryKeys('payouts');
export const cancelledPayoutKeys = createQueryKeys('cancelledPayouts');
export const payoutGroupKeys = createQueryKeys('payoutGroups');

// Contract Keys
export const contractKeys = createQueryKeys('contracts');
export const linkedContractKeys = createQueryKeys('linkedContracts');
export const contractOverviewKeys = createQueryKeys('contractOverview');

// Payee Keys
export const payeeKeys = createQueryKeys('payees');
export const mergedPayeeKeys = createQueryKeys('mergedPayees');

// Anomaly Keys
export const contractAnomalyKeys = createQueryKeys('contractAnomalies');
export const payeeAnomalyKeys = createQueryKeys('payeeAnomalies');

// Currency Keys
export const currencyKeys = createQueryKeys('currencies');

// All Royalty Uploads Keys (across all distros)
export const allRoyaltyUploadsKeys = createQueryKeys('allRoyaltyUploads');

// Contract Royalties Keys
export const contractRoyaltiesKeys = createQueryKeys('contractRoyalties');
