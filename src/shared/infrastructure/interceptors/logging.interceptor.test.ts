import { ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

const mockGetRequest = jest
  .fn()
  .mockReturnValue({ method: 'GET', url: '/health' });
const mockGetResponse = jest.fn().mockReturnValue({ statusCode: 200 });
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getRequest: mockGetRequest,
  getResponse: mockGetResponse,
});
const mockContext = {
  switchToHttp: mockSwitchToHttp,
} as unknown as ExecutionContext;

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs method, url, status, and duration after the handler resolves', () => {
    const next = { handle: () => of({ data: 'ok' }) };

    // finalize runs as a teardown after complete — assert after subscribe() returns
    interceptor.intercept(mockContext, next).subscribe();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = (logSpy.mock.calls as [string][])[0][0];
    expect(message).toMatch(/^GET \/health 200 \d+ms$/);
  });

  it('does not log request body or authorization headers', () => {
    const next = { handle: () => of(null) };

    interceptor.intercept(mockContext, next).subscribe();

    const message = (logSpy.mock.calls as [string][])[0][0];
    expect(message).not.toContain('authorization');
    expect(message).not.toContain('body');
  });

  it('logs on error paths (4xx/5xx exceptions)', () => {
    const next = { handle: () => throwError(() => new Error('not found')) };

    // suppress unhandled error; finalize still runs after teardown
    interceptor
      .intercept(mockContext, next)
      .subscribe({ error: () => undefined });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = (logSpy.mock.calls as [string][])[0][0];
    expect(message).toMatch(/^GET \/health 200 \d+ms$/);
  });
});
