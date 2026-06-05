import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger.setup';

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addBearerAuth: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
}));

describe('setupSwagger', () => {
  it('mounts swagger at /api/docs', () => {
    const app = {} as INestApplication;
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');
    setupSwagger(app);
    expect(setupSpy).toHaveBeenCalledWith('api/docs', app, expect.any(Object));
  });
});
