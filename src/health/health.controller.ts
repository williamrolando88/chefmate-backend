import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../shared/adapters/decorators/public.decorator';
import { HealthResponseDto } from './dto/health-response.dto';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
