import { Module } from '@nestjs/common';
import { OrganizationRepository } from './domain/organization.repository';
import { OrganizationsService } from './application/organizations.service';
import { OrganizationsController } from './adapters/http/organizations.controller';
import { SupabaseOrganizationsRepository } from './adapters/persistence/supabase-organizations.repository';

@Module({
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: OrganizationRepository,
      useClass: SupabaseOrganizationsRepository,
    },
  ],
})
export class OrganizationsModule {}
