import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './shared/infrastructure/app.setup';
import { AppConfig } from './shared/infrastructure/config/app-config';
import { setupCors } from './shared/infrastructure/cors/cors.setup';
import { setupSwagger } from './shared/infrastructure/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get(AppConfig);

  setupCors(app, appConfig.corsOrigins);
  setupApp(app);
  setupSwagger(app);

  await app.listen(appConfig.port);
}
void bootstrap();
