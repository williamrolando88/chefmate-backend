import { UserProfile } from './user.entity';
import { UpdateProfileData, UserRepository } from './user.repository';

class ConcreteUserRepository extends UserRepository {
  findById = jest.fn<Promise<UserProfile | null>, [string]>();
  update = jest.fn<Promise<UserProfile>, [string, UpdateProfileData]>();
}

describe('UserRepository', () => {
  it('can be extended with concrete implementations', () => {
    const repo = new ConcreteUserRepository();
    expect(repo).toBeInstanceOf(UserRepository);
  });
});
