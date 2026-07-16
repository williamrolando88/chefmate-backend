import type { Organization } from './organization.entity';

describe('Organization', () => {
  it('accepts a valid organization shape', () => {
    const org: Organization = {
      id: 'uuid-1',
      taxId: '12345678',
      name: 'Test Org',
      slug: 'test-org',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(org.id).toBe('uuid-1');
  });
});
