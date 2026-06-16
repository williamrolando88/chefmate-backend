import { INestApplication } from '@nestjs/common';
import { setupCors } from './cors.setup';

function makeApp(): { enableCors: jest.Mock } & INestApplication {
  return { enableCors: jest.fn() } as unknown as {
    enableCors: jest.Mock;
  } & INestApplication;
}

describe('setupCors', () => {
  it('enables CORS with the provided origins', () => {
    const app = makeApp();
    setupCors(app, ['http://localhost:3000']);
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: ['http://localhost:3000'] }),
    );
  });

  it('disables CORS when origins list is empty', () => {
    const app = makeApp();
    setupCors(app, []);
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: false }),
    );
  });
});
