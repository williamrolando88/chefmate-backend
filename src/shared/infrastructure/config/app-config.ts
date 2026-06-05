import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    const raw = this.config.getOrThrow<string>('PORT');
    const value = parseInt(raw, 10);
    if (isNaN(value)) {
      throw new Error(`Invalid PORT value: "${raw}"`);
    }
    return value;
  }

  get corsOrigins(): string[] {
    return this.config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
}
