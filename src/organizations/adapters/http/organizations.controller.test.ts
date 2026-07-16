import { Test, TestingModule } from '@nestjs/testing';
import type { UserContext } from '../../../shared/domain/user-context';
import type { OrganizationResponseDto } from '../../application/dto/organization-response.dto';
import { OrganizationsService } from '../../application/organizations.service';
import { OrganizationsController } from './organizations.controller';

const mockOrg: OrganizationResponseDto = {
  id: 'org-1',
  taxId: '12345678',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const ownerContext: UserContext = {
  userId: 'user-1',
  email: 'owner@example.com',
  orgId: 'org-1',
  branchId: null,
  role: 'owner',
};

const mockOrganizationsService = {
  findById: jest.fn(),
  update: jest.fn(),
};

describe('OrganizationsController', () => {
  let controller: OrganizationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: mockOrganizationsService },
      ],
    }).compile();

    controller = module.get(OrganizationsController);
  });

  afterEach(() => jest.clearAllMocks());

  it('findById delegates to service', async () => {
    mockOrganizationsService.findById.mockResolvedValue(mockOrg);

    const result = await controller.findById('org-1', ownerContext);

    expect(result).toBe(mockOrg);
    expect(mockOrganizationsService.findById).toHaveBeenCalledWith(
      'org-1',
      ownerContext,
    );
  });

  it('update delegates to service', async () => {
    const updated = { ...mockOrg, name: 'Updated' };
    mockOrganizationsService.update.mockResolvedValue(updated);

    const result = await controller.update(
      'org-1',
      { name: 'Updated' },
      ownerContext,
    );

    expect(result).toBe(updated);
    expect(mockOrganizationsService.update).toHaveBeenCalledWith(
      'org-1',
      { name: 'Updated' },
      ownerContext,
    );
  });
});
