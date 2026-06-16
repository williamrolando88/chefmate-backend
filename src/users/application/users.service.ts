import { Injectable, NotFoundException } from '@nestjs/common';
import { UserContext } from '../../shared/domain/user-context';
import { UpdateProfileData, UserRepository } from '../domain/user.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getMe(userContext: UserContext): Promise<UserResponseDto> {
    const profile = await this.userRepository.findById(userContext.userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return {
      id: profile.id,
      email: userContext.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      orgId: userContext.orgId,
      branchId: userContext.branchId,
      role: userContext.role,
    };
  }

  async updateMe(
    userContext: UserContext,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const data: UpdateProfileData = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;

    const profile = await this.userRepository.update(userContext.userId, data);
    return {
      id: profile.id,
      email: userContext.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      orgId: userContext.orgId,
      branchId: userContext.branchId,
      role: userContext.role,
    };
  }
}
