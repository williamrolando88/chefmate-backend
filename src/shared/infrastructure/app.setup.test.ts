import { INestApplication, ValidationPipe } from '@nestjs/common';
import { setupApp } from './app.setup';

function makeApp() {
  return {
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
    useGlobalInterceptors: jest.fn(),
  } as unknown as INestApplication;
}

describe('setupApp', () => {
  it('registers ValidationPipe, HttpExceptionFilter, and LoggingInterceptor', () => {
    const app = makeApp();
    setupApp(app);
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(app.useGlobalInterceptors).toHaveBeenCalledTimes(1);
  });
});
