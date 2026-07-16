import { Injectable } from '@nestjs/common';
import type { BootstrapUserContext } from '../../shared/domain/user-context';
import { OnboardingRepository } from '../domain/onboarding.repository';
import { OnboardingDto } from './dto/onboarding.dto';
import { OnboardingResponseDto } from './dto/onboarding-response.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  async setup(
    dto: OnboardingDto,
    userContext: BootstrapUserContext,
  ): Promise<OnboardingResponseDto> {
    return this.onboardingRepository.setup(
      {
        orgTaxId: dto.orgTaxId,
        orgName: dto.orgName,
        orgSlug: dto.orgSlug,
        branchCode: dto.branchCode,
        branchName: dto.branchName,
        branchAddress: dto.branchAddress,
      },
      userContext.userId,
    );
  }
}
