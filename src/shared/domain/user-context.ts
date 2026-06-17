export const MEMBERSHIP_ROLES = [
  'owner',
  'admin',
  'chef',
  'waiter',
  'cashier',
] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export interface UserContext {
  userId: string;
  email: string;
  orgId: string;
  branchId: string | null;
  role: MembershipRole;
}
