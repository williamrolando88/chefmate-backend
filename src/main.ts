import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/infrastructure/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/infrastructure/interceptors/logging.interceptor';
import { setupSwagger } from './shared/infrastructure/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const rawOrigins = config.get<string>('CORS_ORIGINS', '');
  const origins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  setupSwagger(app);

  await app.listen(config.get<number>('PORT', 3000));
}
void bootstrap();
