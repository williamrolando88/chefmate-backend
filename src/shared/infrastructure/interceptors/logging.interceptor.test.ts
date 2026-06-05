import { ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';
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

  it('logs method, url, status, and duration after the handler resolves', (done) => {
    const next = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(mockContext, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const message = logSpy.mock.calls[0][0] as string;
        expect(message).toMatch(/^GET \/health 200 \d+ms$/);
        done();
      },
    });
  });

  it('does not log request body or authorization headers', (done) => {
    const next = { handle: () => of(null) };

    interceptor.intercept(mockContext, next).subscribe({
      complete: () => {
        const message = logSpy.mock.calls[0][0] as string;
        expect(message).not.toContain('authorization');
        expect(message).not.toContain('body');
        done();
      },
    });
  });
});
