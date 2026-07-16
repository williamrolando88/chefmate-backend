import { Module } from '@nestjs/common';
import { OnboardingService } from './application/onboarding.service';
import { OnboardingController } from './adapters/http/onboarding.controller';
import { OnboardingRepository } from './domain/onboarding.repository';
import { SupabaseOnboardingRepository } from './adapters/persistence/supabase-onboarding.repository';

@Module({
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    {
      provide: OnboardingRepository,
      useClass: SupabaseOnboardingRepository,
    },
  ],
})
export class OnboardingModule {}
