import type { Organization } from './organization.entity';

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
}

export abstract class OrganizationRepository {
  abstract findById(id: string): Promise<Organization | null>;
  abstract update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization>;
}
