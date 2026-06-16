import type { MembershipRole, UserContext } from './user-context';

describe('MembershipRole', () => {
  const ALL_ROLES: MembershipRole[] = [
    'owner',
    'admin',
    'chef',
    'waiter',
    'cashier',
  ];

  it('covers all five roles', () => {
    expect(ALL_ROLES).toHaveLength(5);
  });
});

describe('UserContext', () => {
  it('accepts a valid org-level context (branch_id null)', () => {
    const ctx: UserContext = {
      userId: 'u1',
      email: 'owner@example.com',
      orgId: 'org1',
      branchId: null,
      role: 'owner',
    };
    expect(ctx.branchId).toBeNull();
  });

  it('accepts a valid branch-scoped context', () => {
    const ctx: UserContext = {
      userId: 'u2',
      email: 'chef@example.com',
      orgId: 'org1',
      branchId: 'branch1',
      role: 'chef',
    };
    expect(ctx.branchId).toBe('branch1');
  });
});
