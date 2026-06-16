import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../shared/infrastructure/supabase/supabase.service';
import { UserProfile } from '../domain/user.entity';
import { UpdateProfileData, UserRepository } from '../domain/user.repository';

@Injectable()
export class SupabaseUsersRepository extends UserRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async findById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
    };
  }

  async update(
    id: string,
    updateData: UpdateProfileData,
  ): Promise<UserProfile> {
    const { data, error } = await this.supabaseService.supabase
      .from('profiles')
      .update({
        ...(updateData.firstName !== undefined && {
          first_name: updateData.firstName,
        }),
        ...(updateData.lastName !== undefined && {
          last_name: updateData.lastName,
        }),
        ...(updateData.avatarUrl !== undefined && {
          avatar_url: updateData.avatarUrl,
        }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException();
    }

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
    };
  }
}
