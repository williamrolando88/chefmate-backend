import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MEMBERSHIP_ROLES } from '../../../shared/domain/user-context';
import type { MembershipRole } from '../../../shared/domain/user-context';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  firstName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatarUrl: string | null;

  @ApiProperty()
  orgId: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  branchId: string | null;

  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  role: MembershipRole;
}
