import { INestApplication, ValidationPipe } from '@nestjs/common';
import { setupApp } from './app.setup';

function makeApp() {
  const useGlobalPipes = jest.fn();
  const useGlobalFilters = jest.fn();
  const useGlobalInterceptors = jest.fn();
  return {
    app: {
      useGlobalPipes,
      useGlobalFilters,
      useGlobalInterceptors,
    } as unknown as INestApplication,
    useGlobalPipes,
    useGlobalFilters,
    useGlobalInterceptors,
  };
}

describe('setupApp', () => {
  it('registers ValidationPipe, HttpExceptionFilter, and LoggingInterceptor', () => {
    const { app, useGlobalPipes, useGlobalFilters, useGlobalInterceptors } =
      makeApp();
    setupApp(app);
    expect(useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(useGlobalInterceptors).toHaveBeenCalledTimes(1);
  });
});
