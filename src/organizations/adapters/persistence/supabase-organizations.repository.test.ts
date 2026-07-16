import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/adapters/supabase/database.types';
import { SupabaseService } from '../../../shared/adapters/supabase/supabase.service';
import { SupabaseOrganizationsRepository } from './supabase-organizations.repository';

const orgRow = {
  id: 'org-1',
  tax_id: '12345678',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('SupabaseOrganizationsRepository', () => {
  let repository: SupabaseOrganizationsRepository;
  const mockSupabaseService = {
    supabase: {} as SupabaseClient<Database>,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupabaseOrganizationsRepository,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    repository = module.get(SupabaseOrganizationsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('returns mapped org when found', async () => {
      const single = jest.fn().mockResolvedValue({ data: orgRow, error: null });
      const eq = jest.fn().mockReturnValue({ single });
      const select = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ select }),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.findById('org-1');

      expect(result).toEqual({
        id: 'org-1',
        taxId: '12345678',
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('returns null when org not found', async () => {
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
    it('returns updated org', async () => {
      const updatedRow = { ...orgRow, name: 'New Name' };
      const single = jest
        .fn()
        .mockResolvedValue({ data: updatedRow, error: null });
      const updateSelect = jest.fn().mockReturnValue({ single });
      const eq = jest.fn().mockReturnValue({ select: updateSelect });
      const update = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ update }),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.update('org-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('throws ConflictException on unique constraint violation', async () => {
      const single = jest
        .fn()
        .mockResolvedValue({ data: null, error: { code: '23505' } });
      const updateSelect = jest.fn().mockReturnValue({ single });
      const eq = jest.fn().mockReturnValue({ select: updateSelect });
      const update = jest.fn().mockReturnValue({ eq });
      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ update }),
      } as unknown as SupabaseClient<Database>;

      await expect(
        repository.update('org-1', { slug: 'dup-slug' }),
      ).rejects.toThrow(ConflictException);
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

      await expect(repository.update('org-1', { name: 'X' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
