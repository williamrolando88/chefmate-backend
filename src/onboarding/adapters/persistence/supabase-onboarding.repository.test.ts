import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/adapters/supabase/database.types';
import { SupabaseService } from '../../../shared/adapters/supabase/supabase.service';
import { SupabaseOnboardingRepository } from './supabase-onboarding.repository';

const orgRow = {
  id: 'org-1',
  tax_id: '12345678',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const branchRow = {
  id: 'branch-1',
  org_id: 'org-1',
  code: 1,
  name: 'Main Branch',
  address: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const setupData = {
  orgTaxId: '12345678',
  orgName: 'Test Restaurant',
  orgSlug: 'test-restaurant',
  branchCode: 1,
  branchName: 'Main Branch',
};

describe('SupabaseOnboardingRepository', () => {
  let repository: SupabaseOnboardingRepository;
  const mockSupabaseService = {
    supabase: {} as SupabaseClient<Database>,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupabaseOnboardingRepository,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    repository = module.get(SupabaseOnboardingRepository);
  });

  afterEach(() => jest.clearAllMocks());

  function makeInsertChain(resolvedValue: { data: unknown; error: unknown }) {
    const single = jest.fn().mockResolvedValue(resolvedValue);
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    return { insert, select, single };
  }

  function makeMemberInsert(resolvedValue: { error: unknown }) {
    const insert = jest.fn().mockResolvedValue(resolvedValue);
    return { insert };
  }

  describe('setup', () => {
    it('creates org, branch, and membership and returns ids', async () => {
      const orgChain = makeInsertChain({ data: orgRow, error: null });
      const branchChain = makeInsertChain({ data: branchRow, error: null });
      const memberChain = makeMemberInsert({ error: null });

      mockSupabaseService.supabase = {
        from: jest
          .fn()
          .mockImplementationOnce(() => ({ insert: orgChain.insert }))
          .mockImplementationOnce(() => ({ insert: branchChain.insert }))
          .mockImplementationOnce(() => ({ insert: memberChain.insert })),
      } as unknown as SupabaseClient<Database>;

      const result = await repository.setup(setupData, 'user-1');

      expect(result).toEqual({ orgId: 'org-1', branchId: 'branch-1' });
    });

    it('throws ConflictException on duplicate org tax_id or slug', async () => {
      const orgChain = makeInsertChain({
        data: null,
        error: { code: '23505' },
      });

      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ insert: orgChain.insert }),
      } as unknown as SupabaseClient<Database>;

      await expect(repository.setup(setupData, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws InternalServerErrorException on org insert failure', async () => {
      const orgChain = makeInsertChain({
        data: null,
        error: { message: 'db error' },
      });

      mockSupabaseService.supabase = {
        from: jest.fn().mockReturnValue({ insert: orgChain.insert }),
      } as unknown as SupabaseClient<Database>;

      await expect(repository.setup(setupData, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws ConflictException on duplicate branch code', async () => {
      const orgChain = makeInsertChain({ data: orgRow, error: null });
      const branchChain = makeInsertChain({
        data: null,
        error: { code: '23505' },
      });

      mockSupabaseService.supabase = {
        from: jest
          .fn()
          .mockImplementationOnce(() => ({ insert: orgChain.insert }))
          .mockImplementationOnce(() => ({ insert: branchChain.insert })),
      } as unknown as SupabaseClient<Database>;

      await expect(repository.setup(setupData, 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws InternalServerErrorException on branch insert failure', async () => {
      const orgChain = makeInsertChain({ data: orgRow, error: null });
      const branchChain = makeInsertChain({
        data: null,
        error: { message: 'branch error' },
      });

      mockSupabaseService.supabase = {
        from: jest
          .fn()
          .mockImplementationOnce(() => ({ insert: orgChain.insert }))
          .mockImplementationOnce(() => ({ insert: branchChain.insert })),
      } as unknown as SupabaseClient<Database>;

      await expect(repository.setup(setupData, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException on membership insert failure', async () => {
      const orgChain = makeInsertChain({ data: orgRow, error: null });
      const branchChain = makeInsertChain({ data: branchRow, error: null });
      const memberChain = makeMemberInsert({
        error: { message: 'member error' },
      });

      mockSupabaseService.supabase = {
        from: jest
          .fn()
          .mockImplementationOnce(() => ({ insert: orgChain.insert }))
          .mockImplementationOnce(() => ({ insert: branchChain.insert }))
          .mockImplementationOnce(() => ({ insert: memberChain.insert })),
      } as unknown as SupabaseClient<Database>;

      await expect(repository.setup(setupData, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
