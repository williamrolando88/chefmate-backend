import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class OnboardingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orgTaxId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orgName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orgSlug: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  branchCode: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchAddress?: string;
}
