/**
 * Invitation data structure based on Better Auth API
 */
export interface Invitation {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  inviterId: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  organizationSlug: string;
  // Optional fields that may be populated by the API
  organizationName?: string;
  organizationLogo?: string;
  inviterEmail?: string;
  // Better Auth might use nested organization object
  organization?: {
    id: string;
    name: string;
    slug?: string;
    logo?: string;
  };
}
