import { UserRole } from './user';

// Invitation status types
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

// Member role type (Better Auth organization roles)
export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * Organization data structure
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: string | Date;
  metadata?: string | null;
}

/**
 * Organization member data structure
 */
export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  createdAt?: string | Date;
  user?: {
    id: string;
    name?: string;
    email: string;
    image?: string;
    emailVerified?: boolean;
    createdAt?: string | Date;
  };
}

/**
 * Organization invitation data structure
 */
export interface OrganizationInvitation {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  inviterId: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  organizationName: string;
}

/**
 * Active member details
 */
export interface ActiveMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Organization role data structure
 */
export interface OrganizationRole {
  id: string;
  role: string;
  permission: Record<string, string[]>;
  organizationId: string;
}

// ==================
// Request DTOs
// ==================

/**
 * Invite member request data
 */
export interface InviteMemberData {
  email: string;
  role: UserRole;
  organizationId?: string;
  resend?: boolean;
}

/**
 * Remove member request data
 */
export interface RemoveMemberData {
  memberIdOrEmail: string;
  organizationId?: string;
}

/**
 * Update member role request data
 */
export interface UpdateMemberRoleData {
  memberId: string;
  role: UserRole;
  organizationId?: string;
}

/**
 * Create organization request data
 */
export interface CreateOrganizationData {
  name: string;
  slug?: string;
  logo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update organization request data
 */
export interface UpdateOrganizationData {
  organizationId?: string;
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Leave organization request data
 */
export interface LeaveOrganizationData {
  organizationId: string;
}

/**
 * Create role request data
 */
export interface CreateRoleData {
  role: string;
  permission: Record<string, string[]>;
  organizationId?: string;
  additionalFields?: Record<string, unknown>;
}

/**
 * Update role request data
 */
export interface UpdateRoleData {
  roleId: string;
  role?: string;
  permission?: Record<string, string[]>;
  organizationId?: string;
}

/**
 * Delete role request data
 */
export interface DeleteRoleData {
  roleId: string;
  organizationId?: string;
}

/**
 * Check permission request data
 */
export interface CheckPermissionData {
  permissions: Record<string, string[]>;
}

// ==================
// Response types
// ==================

/**
 * List members response
 */
export interface ListMembersResponse {
  members: OrganizationMember[];
}

/**
 * Remove member response
 */
export interface RemoveMemberResponse {
  member: OrganizationMember;
}

/**
 * Update member role response
 */
export interface UpdateMemberRoleResponse {
  member: OrganizationMember;
}

/**
 * Accept/Reject invitation response
 */
export interface InvitationActionResponse {
  invitation: OrganizationInvitation;
  member?: OrganizationMember;
}

/**
 * Check permission response
 */
export interface CheckPermissionResponse {
  success: boolean;
  error?: string;
}
