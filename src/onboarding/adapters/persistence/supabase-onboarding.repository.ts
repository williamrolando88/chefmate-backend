import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/adapters/supabase/supabase.service';
import {
  OnboardingRepository,
  OnboardingSetupData,
  OnboardingSetupResult,
} from '../../domain/onboarding.repository';

@Injectable()
export class SupabaseOnboardingRepository extends OnboardingRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async setup(
    data: OnboardingSetupData,
    ownerId: string,
  ): Promise<OnboardingSetupResult> {
    const { data: orgRow, error: orgError } =
      await this.supabaseService.supabase
        .from('organizations')
        .insert({
          tax_id: data.orgTaxId,
          name: data.orgName,
          slug: data.orgSlug,
        })
        .select()
        .single();

    if (orgError?.code === '23505') {
      throw new ConflictException(
        'An organization with this tax ID or slug already exists',
      );
    }
    if (orgError || !orgRow) {
      throw new InternalServerErrorException();
    }

    const { data: branchRow, error: branchError } =
      await this.supabaseService.supabase
        .from('branches')
        .insert({
          org_id: orgRow.id,
          code: data.branchCode,
          name: data.branchName,
          address: data.branchAddress ?? null,
        })
        .select()
        .single();

    if (branchError?.code === '23505') {
      throw new ConflictException(
        'A branch with this code already exists for the organization',
      );
    }
    if (branchError || !branchRow) {
      throw new InternalServerErrorException();
    }

    const { error: memberError } = await this.supabaseService.supabase
      .from('memberships')
      .insert({
        org_id: orgRow.id,
        user_id: ownerId,
        role: 'owner',
        branch_id: null,
      });

    if (memberError) {
      throw new InternalServerErrorException();
    }

    return { orgId: orgRow.id, branchId: branchRow.id };
  }
}
