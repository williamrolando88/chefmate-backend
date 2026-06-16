import { UserProfile } from './user.entity';

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export abstract class UserRepository {
  abstract findById(id: string): Promise<UserProfile | null>;
  abstract update(id: string, data: UpdateProfileData): Promise<UserProfile>;
}
