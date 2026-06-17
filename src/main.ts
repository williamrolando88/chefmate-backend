import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './shared/adapters/app.setup';
import { AppConfig } from './shared/adapters/config/app-config';
import { setupCors } from './shared/adapters/cors/cors.setup';
import { setupSwagger } from './shared/adapters/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get(AppConfig);

  setupCors(app, appConfig.corsOrigins);
  setupApp(app);
  setupSwagger(app);

  await app.listen(appConfig.port);
}
void bootstrap();
