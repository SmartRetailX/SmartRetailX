import { ApplicationsResponse } from '@/schemas';
import { Application } from '@/types';

function deriveStatus(approved: boolean, pending: boolean): Application['status'] {
  if (approved) return 'approved';
  if (pending) return 'pending';
  return 'rejected';
}

export function mapApplication(api: ApplicationsResponse[number]): Application {
  return {
    id: api._id,

    user: {
      id: api.userId._id,
      name: api.userId.name,
      email: api.userId.email,
    },

    firstName: api.firstName,
    lastName: api.lastName,
    company: api.company,
    email: api.email,
    country: api.country,

    businessType: api.businessType,
    estimatedCatalogueSize: api.estimatedCatalogueSize,
    estimatedContractCount: api.estimatedContractCount,
    frequencyOfReporting: api.frequencyOfReporting,

    status: deriveStatus(api.approved, api.pending),
    rejectionReason: api.rejectionReason ?? undefined,

    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

export function mapApplications(apiList: ApplicationsResponse): Application[] {
  return apiList.map(mapApplication);
}
