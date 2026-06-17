import { UserResponseDto } from './user-response.dto';

describe('UserResponseDto', () => {
  it('holds all response fields', () => {
    const dto = Object.assign(new UserResponseDto(), {
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: null,
      orgId: 'org-1',
      branchId: null,
      role: 'owner',
    });
    expect(dto.id).toBe('user-1');
    expect(dto.role).toBe('owner');
    expect(dto.branchId).toBeNull();
  });
});
