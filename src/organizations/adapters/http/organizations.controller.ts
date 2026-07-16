import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/adapters/decorators/current-user.decorator';
import type { UserContext } from '../../../shared/domain/user-context';
import { OrganizationResponseDto } from '../../application/dto/organization-response.dto';
import { UpdateOrganizationDto } from '../../application/dto/update-organization.dto';
import { OrganizationsService } from '../../application/organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id')
  @ApiOkResponse({ type: OrganizationResponseDto })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.findById(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OrganizationResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: UserContext,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, dto, user);
  }
}
