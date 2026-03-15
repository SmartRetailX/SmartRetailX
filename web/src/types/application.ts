import { User } from './user';

type ApplicationUser = Pick<User, 'id' | 'name' | 'email'>;

export interface Application {
  id: string;
  user: ApplicationUser;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  country: string;
  businessType: string;
  estimatedCatalogueSize: string;
  estimatedContractCount: string;
  frequencyOfReporting: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
