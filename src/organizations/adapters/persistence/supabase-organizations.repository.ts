import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../../shared/adapters/supabase/supabase.service';
import type { Organization } from '../../domain/organization.entity';
import {
  OrganizationRepository,
  UpdateOrganizationData,
} from '../../domain/organization.repository';

function toOrganization(row: {
  id: string;
  tax_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}): Organization {
  return {
    id: row.id,
    taxId: row.tax_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class SupabaseOrganizationsRepository extends OrganizationRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async findById(id: string): Promise<Organization | null> {
    const { data, error } = await this.supabaseService.supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return toOrganization(data);
  }

  async update(
    id: string,
    data: UpdateOrganizationData,
  ): Promise<Organization> {
    const { data: row, error } = await this.supabaseService.supabase
      .from('organizations')
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error?.code === '23505') {
      throw new ConflictException(
        'An organization with this slug already exists',
      );
    }
    if (error || !row) {
      throw new InternalServerErrorException();
    }

    return toOrganization(row);
  }
}
