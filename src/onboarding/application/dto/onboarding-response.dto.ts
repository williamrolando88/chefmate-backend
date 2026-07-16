import { ApiProperty } from '@nestjs/swagger';

export class OnboardingResponseDto {
  @ApiProperty()
  orgId: string;

  @ApiProperty()
  branchId: string;
}
