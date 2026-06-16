export type MembershipRole = 'owner' | 'admin' | 'chef' | 'waiter' | 'cashier';

export interface UserContext {
  userId: string;
  email: string;
  orgId: string;
  branchId: string | null;
  role: MembershipRole;
}
