import { ConfigService } from '@nestjs/config';
import { AppConfig } from './app-config';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (!(key in values)) throw new Error(`Missing env: ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
}

describe('AppConfig', () => {
  describe('port', () => {
    it('parses PORT as a number', () => {
      const cfg = new AppConfig(makeConfig({ PORT: '4000', CORS_ORIGINS: '' }));
      expect(cfg.port).toBe(4000);
    });

    it('throws when PORT is missing', () => {
      const cfg = new AppConfig(makeConfig({ CORS_ORIGINS: '' }));
      expect(() => cfg.port).toThrow('Missing env: PORT');
    });

    it('throws when PORT is not a valid number', () => {
      const cfg = new AppConfig(makeConfig({ PORT: 'abc', CORS_ORIGINS: '' }));
      expect(() => cfg.port).toThrow('Invalid PORT value: "abc"');
    });
  });

  describe('corsOrigins', () => {
    it('splits and trims CORS_ORIGINS', () => {
      const cfg = new AppConfig(
        makeConfig({
          PORT: '3000',
          CORS_ORIGINS: 'http://a.com, http://b.com',
        }),
      );
      expect(cfg.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
    });

    it('returns empty array for blank CORS_ORIGINS', () => {
      const cfg = new AppConfig(makeConfig({ PORT: '3000', CORS_ORIGINS: '' }));
      expect(cfg.corsOrigins).toEqual([]);
    });

    it('throws when CORS_ORIGINS is missing', () => {
      const cfg = new AppConfig(makeConfig({ PORT: '3000' }));
      expect(() => cfg.corsOrigins).toThrow('Missing env: CORS_ORIGINS');
    });
  });
});
