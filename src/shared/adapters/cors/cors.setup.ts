import { INestApplication } from '@nestjs/common';

export function setupCors(app: INestApplication, origins: string[]): void {
  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
}
