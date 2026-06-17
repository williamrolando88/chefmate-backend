import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/adapters/supabase/database.types';
import { SupabaseService } from '../../../shared/adapters/supabase/supabase.service';
import { SupabaseUsersRepository } from './supabase-users.repository';

const profileRow = {
  id: 'user-1',
  first_name: 'John',
  last_name: 'Doe',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('SupabaseUsersRepository', () => {
  let repository: SupabaseUsersRepository;
  const mockSupabaseService = {
    supabase: {} as SupabaseClient<Database>,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupabaseUsersRepository,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    repository = module.get(SupabaseUsersRepository);
  });

  describe('findById', () => {
    it('returns a mapped profile when the row exists', async () => {
      const single = jest
        .fn()
        .mockResolvedValue({ data: profileRow, error: null });
      const eq = jest.fn().mockReturnValue({ single });
      const select = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ select }),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.findById('user-1');

      expect(result).toEqual({
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: null,
      });
    });

    it('returns null when no row is found', async () => {
      const single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const eq = jest.fn().mockReturnValue({ single });
      const select = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ select }),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.findById('unknown');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('returns the updated profile', async () => {
      const updatedRow = { ...profileRow, first_name: 'Jane' };
      const single = jest
        .fn()
        .mockResolvedValue({ data: updatedRow, error: null });
      const updateSelect = jest.fn().mockReturnValue({ single });
      const eq = jest.fn().mockReturnValue({ select: updateSelect });
      const update = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ update }),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.update('user-1', { firstName: 'Jane' });

      expect(result.firstName).toBe('Jane');
    });

    it('throws InternalServerErrorException on database error', async () => {
      const single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'db error' } });
      const updateSelect = jest.fn().mockReturnValue({ single });
      const eq = jest.fn().mockReturnValue({ select: updateSelect });
      const update = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ update }),
      } as unknown as SupabaseClient<Database>;

      await expect(
        repository.update('user-1', { firstName: 'Jane' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
