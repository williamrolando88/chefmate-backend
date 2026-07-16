import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserContext } from '../../shared/domain/user-context';
import type { Organization } from '../domain/organization.entity';
import {
  OrganizationRepository,
  UpdateOrganizationData,
} from '../domain/organization.repository';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

function toDto(org: Organization): OrganizationResponseDto {
  return {
    id: org.id,
    taxId: org.taxId,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly orgRepository: OrganizationRepository) {}

  async findById(
    id: string,
    userContext: UserContext,
  ): Promise<OrganizationResponseDto> {
    if (userContext.orgId !== id) {
      throw new ForbiddenException();
    }
    const org = await this.orgRepository.findById(id);
    if (!org) throw new NotFoundException();
    return toDto(org);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    userContext: UserContext,
  ): Promise<OrganizationResponseDto> {
    if (userContext.role !== 'owner' && userContext.role !== 'admin') {
      throw new ForbiddenException();
    }
    if (userContext.orgId !== id) {
      throw new ForbiddenException();
    }

    const data: UpdateOrganizationData = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;

    const org = await this.orgRepository.update(id, data);
    return toDto(org);
  }
}
