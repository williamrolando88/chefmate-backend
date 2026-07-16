import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { BootstrapUser } from '../../../shared/adapters/decorators/bootstrap-user.decorator';
import { NoOrgRequired } from '../../../shared/adapters/decorators/no-org-required.decorator';
import type { BootstrapUserContext } from '../../../shared/domain/user-context';
import { OnboardingDto } from '../../application/dto/onboarding.dto';
import { OnboardingResponseDto } from '../../application/dto/onboarding-response.dto';
import { OnboardingService } from '../../application/onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @NoOrgRequired()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: OnboardingResponseDto })
  setup(
    @Body() dto: OnboardingDto,
    @BootstrapUser() user: BootstrapUserContext,
  ): Promise<OnboardingResponseDto> {
    return this.onboardingService.setup(dto, user);
  }
}
