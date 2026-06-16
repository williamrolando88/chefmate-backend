import { UserProfile } from './user.entity';

describe('UserProfile', () => {
  it('holds profile fields', () => {
    const profile: UserProfile = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: null,
    };
    expect(profile.id).toBe('user-1');
    expect(profile.avatarUrl).toBeNull();
  });
});
