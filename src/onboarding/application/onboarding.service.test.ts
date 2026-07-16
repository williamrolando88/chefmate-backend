import { Test } from '@nestjs/testing';
import type { BootstrapUserContext } from '../../shared/domain/user-context';
import {
  OnboardingRepository,
  OnboardingSetupData,
  OnboardingSetupResult,
} from '../domain/onboarding.repository';
import { OnboardingService } from './onboarding.service';

const mockResult: OnboardingSetupResult = {
  orgId: 'org-1',
  branchId: 'branch-1',
};

const bootstrapUser: BootstrapUserContext = {
  userId: 'user-new',
  email: 'new@example.com',
};

class MockOnboardingRepository extends OnboardingRepository {
  setup = jest.fn<
    Promise<OnboardingSetupResult>,
    [OnboardingSetupData, string]
  >();
}

describe('OnboardingService', () => {
  let service: OnboardingService;
  let repository: MockOnboardingRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: OnboardingRepository, useClass: MockOnboardingRepository },
      ],
    }).compile();

    service = module.get(OnboardingService);
    repository = module.get(OnboardingRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates to repository with correct data and returns result', async () => {
    repository.setup.mockResolvedValue(mockResult);

    const dto = {
      orgTaxId: '12345678',
      orgName: 'Test Restaurant',
      orgSlug: 'test-restaurant',
      branchCode: 1,
      branchName: 'Main Branch',
      branchAddress: '123 Main St',
    };

    const result = await service.setup(dto, bootstrapUser);

    expect(result).toEqual(mockResult);
    expect(repository.setup).toHaveBeenCalledWith(
      {
        orgTaxId: '12345678',
        orgName: 'Test Restaurant',
        orgSlug: 'test-restaurant',
        branchCode: 1,
        branchName: 'Main Branch',
        branchAddress: '123 Main St',
      },
      'user-new',
    );
  });

  it('omits branchAddress when not provided', async () => {
    repository.setup.mockResolvedValue(mockResult);

    await service.setup(
      {
        orgTaxId: '12345678',
        orgName: 'Test Restaurant',
        orgSlug: 'test-restaurant',
        branchCode: 1,
        branchName: 'Main Branch',
      },
      bootstrapUser,
    );

    expect(repository.setup).toHaveBeenCalledWith(
      expect.objectContaining({ branchAddress: undefined }),
      'user-new',
    );
  });
});
