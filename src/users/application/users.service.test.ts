import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserContext } from '../../shared/domain/user-context';
import { UserProfile } from '../domain/user.entity';
import { UpdateProfileData, UserRepository } from '../domain/user.repository';
import { UsersService } from './users.service';

const mockProfile: UserProfile = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: null,
};

const mockUserContext: UserContext = {
  userId: 'user-1',
  email: 'john@example.com',
  orgId: 'org-1',
  branchId: null,
  role: 'owner',
};

class MockUserRepository extends UserRepository {
  findById = jest.fn<Promise<UserProfile | null>, [string]>();
  update = jest.fn<Promise<UserProfile>, [string, UpdateProfileData]>();
}

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockUserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useClass: MockUserRepository },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UserRepository);
  });

  describe('getMe', () => {
    it('returns profile merged with user context', async () => {
      repository.findById.mockResolvedValue(mockProfile);

      const result = await service.getMe(mockUserContext);

      expect(result).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
        orgId: 'org-1',
        branchId: null,
        role: 'owner',
      });
      expect(repository.findById).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException when no profile exists', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getMe(mockUserContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('passes only defined fields to the repository', async () => {
      repository.update.mockResolvedValue(mockProfile);

      await service.updateMe(mockUserContext, { firstName: 'Jane' });

      expect(repository.update).toHaveBeenCalledWith('user-1', {
        firstName: 'Jane',
      });
    });

    it('returns updated profile merged with user context', async () => {
      const updated: UserProfile = { ...mockProfile, firstName: 'Jane' };
      repository.update.mockResolvedValue(updated);

      const result = await service.updateMe(mockUserContext, {
        firstName: 'Jane',
      });

      expect(result.firstName).toBe('Jane');
      expect(result.email).toBe('john@example.com');
      expect(result.role).toBe('owner');
    });
  });
});
