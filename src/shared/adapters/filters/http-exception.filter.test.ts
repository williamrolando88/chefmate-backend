import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockGetRequest = jest.fn().mockReturnValue({ url: '/test-path' });
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
});
const mockHost = { switchToHttp: mockSwitchToHttp } as unknown as ArgumentsHost;

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
    mockStatus.mockReturnValue({ json: mockJson });
  });

  it('returns normalized error shape for a string response', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'NOT_FOUND',
        message: 'Not found',
        path: '/test-path',
      }),
    );
  });

  it('extracts message from object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
      }),
    );
  });

  it('includes a timestamp in ISO 8601 format', () => {
    const exception = new HttpException(
      'Error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    filter.catch(exception, mockHost);

    const call = (mockJson.mock.calls as [Record<string, unknown>][])[0][0];
    expect(typeof call['timestamp']).toBe('string');
    expect(() => new Date(call['timestamp'] as string)).not.toThrow();
  });
});
