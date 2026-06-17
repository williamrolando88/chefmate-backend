import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: jest.fn() })),
}));

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe('SupabaseService', () => {
  const SUPABASE_URL = 'http://127.0.0.1:54321';
  const SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  let service: SupabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY,
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates the client with the correct URL and service role key', () => {
    expect(mockCreateClient).toHaveBeenCalledWith(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it('exposes the Supabase client via the supabase getter', () => {
    expect(service.supabase).toBeDefined();
  });
});
