import { Test, TestingModule } from '@nestjs/testing';
import type { BootstrapUserContext } from '../../../shared/domain/user-context';
import type { OnboardingResponseDto } from '../../application/dto/onboarding-response.dto';
import { OnboardingService } from '../../application/onboarding.service';
import { OnboardingController } from './onboarding.controller';

const mockResult: OnboardingResponseDto = {
  orgId: 'org-1',
  branchId: 'branch-1',
};

const bootstrapUser: BootstrapUserContext = {
  userId: 'user-new',
  email: 'new@example.com',
};

const mockOnboardingService = { setup: jest.fn() };

describe('OnboardingController', () => {
  let controller: OnboardingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    }).compile();

    controller = module.get(OnboardingController);
  });

  afterEach(() => jest.clearAllMocks());

  it('setup delegates to service and returns result', async () => {
    mockOnboardingService.setup.mockResolvedValue(mockResult);

    const dto = {
      orgTaxId: '12345678',
      orgName: 'Test Restaurant',
      orgSlug: 'test-restaurant',
      branchCode: 1,
      branchName: 'Main Branch',
    };

    const result = await controller.setup(dto, bootstrapUser);

    expect(result).toBe(mockResult);
    expect(mockOnboardingService.setup).toHaveBeenCalledWith(
      dto,
      bootstrapUser,
    );
  });
});
