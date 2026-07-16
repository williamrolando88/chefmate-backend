import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { UserContext } from '../../shared/domain/user-context';
import type { Organization } from '../domain/organization.entity';
import {
  OrganizationRepository,
  UpdateOrganizationData,
} from '../domain/organization.repository';
import { OrganizationsService } from './organizations.service';

const mockOrg: Organization = {
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

class MockOrganizationRepository extends OrganizationRepository {
  findById = jest.fn<Promise<Organization | null>, [string]>();
  update = jest.fn<Promise<Organization>, [string, UpdateOrganizationData]>();
}

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repository: MockOrganizationRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: OrganizationRepository,
          useClass: MockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get(OrganizationsService);
    repository = module.get(OrganizationRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findById', () => {
    it('returns the org when id matches userContext.orgId', async () => {
      repository.findById.mockResolvedValue(mockOrg);

      const result = await service.findById('org-1', ownerContext);

      expect(result.id).toBe('org-1');
      expect(repository.findById).toHaveBeenCalledWith('org-1');
    });

    it('throws ForbiddenException when id does not match orgId', async () => {
      await expect(service.findById('other-org', ownerContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when org does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('org-1', ownerContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates org when caller is owner', async () => {
      const updated = { ...mockOrg, name: 'New Name' };
      repository.update.mockResolvedValue(updated);

      const result = await service.update(
        'org-1',
        { name: 'New Name' },
        ownerContext,
      );

      expect(result.name).toBe('New Name');
      expect(repository.update).toHaveBeenCalledWith('org-1', {
        name: 'New Name',
      });
    });

    it('updates org when caller is admin', async () => {
      const adminContext: UserContext = { ...ownerContext, role: 'admin' };
      repository.update.mockResolvedValue(mockOrg);

      await expect(
        service.update('org-1', { slug: 'new-slug' }, adminContext),
      ).resolves.not.toThrow();
    });

    it('throws ForbiddenException for non-admin roles', async () => {
      const chefContext: UserContext = { ...ownerContext, role: 'chef' };

      await expect(
        service.update('org-1', { name: 'New' }, chefContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when id does not match orgId', async () => {
      await expect(
        service.update('other-org', { name: 'New' }, ownerContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('passes only defined fields to repository', async () => {
      repository.update.mockResolvedValue(mockOrg);

      await service.update('org-1', { name: 'New Name' }, ownerContext);

      expect(repository.update).toHaveBeenCalledWith('org-1', {
        name: 'New Name',
      });
    });
  });
});
