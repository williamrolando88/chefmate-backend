import { Test } from '@nestjs/testing';
import { UserContext } from '../../../shared/domain/user-context';
import { UserResponseDto } from '../../application/dto/user-response.dto';
import { UsersService } from '../../application/users.service';
import { UsersController } from './users.controller';

const mockUser: UserContext = {
  userId: 'user-1',
  email: 'john@example.com',
  orgId: 'org-1',
  branchId: null,
  role: 'owner',
};

const mockResponse: UserResponseDto = {
  id: 'user-1',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: null,
  orgId: 'org-1',
  branchId: null,
  role: 'owner',
};

const mockUsersService = {
  getMe: jest.fn(),
  updateMe: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('delegates to service and returns result', async () => {
      mockUsersService.getMe.mockResolvedValue(mockResponse);

      const result = await controller.getMe(mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockUsersService.getMe).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('updateMe', () => {
    it('delegates to service with user context and dto', async () => {
      const dto = { firstName: 'Jane' };
      mockUsersService.updateMe.mockResolvedValue({
        ...mockResponse,
        firstName: 'Jane',
      });

      const result = await controller.updateMe(mockUser, dto);

      expect(result.firstName).toBe('Jane');
      expect(mockUsersService.updateMe).toHaveBeenCalledWith(mockUser, dto);
    });
  });
});
