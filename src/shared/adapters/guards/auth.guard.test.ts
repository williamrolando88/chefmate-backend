import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { BootstrapUserContext, UserContext } from '../../domain/user-context';
import { AuthGuard } from './auth.guard';

function makeContext(
  headers: Record<string, string> = {},
  flags: { isPublic?: boolean; isNoOrgRequired?: boolean } = {},
) {
  const reflector = {
    getAllAndOverride: jest.fn().mockImplementation((key: string) => {
      if (key === 'isPublic') return flags.isPublic ?? false;
      if (key === 'isNoOrgRequired') return flags.isNoOrgRequired ?? false;
      return false;
    }),
  } as unknown as Reflector;

  const request: {
    headers: Record<string, string>;
    user?: UserContext;
    bootstrapUser?: BootstrapUserContext;
  } = { headers };

  const ctx = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { ctx, reflector, request };
}

const mockVerify = jest.fn();
const mockJwtService = { verify: mockVerify } as unknown as JwtService;

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows public routes without a token', () => {
    const { ctx, reflector } = makeContext({}, { isPublic: true });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 401 when Authorization header is missing', () => {
    const { ctx, reflector } = makeContext();
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws 401 when Authorization scheme is not Bearer', () => {
    const { ctx, reflector } = makeContext({ authorization: 'Basic abc123' });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws 401 when the JWT signature is invalid', () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const { ctx, reflector } = makeContext({
      authorization: 'Bearer bad.token.here',
    });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws 403 when sub is missing from payload', () => {
    mockVerify.mockReturnValue({
      email: 'u@example.com',
      app_metadata: { org_id: 'org1', role: 'owner' },
    });
    const { ctx, reflector } = makeContext({ authorization: 'Bearer token' });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when app_metadata is missing entirely', () => {
    mockVerify.mockReturnValue({ sub: 'u1', email: 'u@example.com' });
    const { ctx, reflector } = makeContext({ authorization: 'Bearer token' });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when org_id claim is absent', () => {
    mockVerify.mockReturnValue({
      sub: 'u1',
      email: 'u@example.com',
      app_metadata: { role: 'chef' },
    });
    const { ctx, reflector } = makeContext({ authorization: 'Bearer token' });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 when role is unrecognized', () => {
    mockVerify.mockReturnValue({
      sub: 'u1',
      email: 'u@example.com',
      app_metadata: { org_id: 'org1', role: 'superadmin' },
    });
    const { ctx, reflector } = makeContext({ authorization: 'Bearer token' });
    const guard = new AuthGuard(mockJwtService, reflector);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('attaches UserContext with null branchId for an org-level token', () => {
    mockVerify.mockReturnValue({
      sub: 'u1',
      email: 'owner@example.com',
      app_metadata: { org_id: 'org1', role: 'owner' },
    });
    const { ctx, reflector, request } = makeContext({
      authorization: 'Bearer token',
    });
    const guard = new AuthGuard(mockJwtService, reflector);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual<UserContext>({
      userId: 'u1',
      email: 'owner@example.com',
      orgId: 'org1',
      branchId: null,
      role: 'owner',
    });
  });

  it('attaches UserContext with branchId for a branch-scoped token', () => {
    mockVerify.mockReturnValue({
      sub: 'u2',
      email: 'chef@example.com',
      app_metadata: { org_id: 'org1', branch_id: 'branch1', role: 'chef' },
    });
    const { ctx, reflector, request } = makeContext({
      authorization: 'Bearer token',
    });
    const guard = new AuthGuard(mockJwtService, reflector);

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual<UserContext>({
      userId: 'u2',
      email: 'chef@example.com',
      orgId: 'org1',
      branchId: 'branch1',
      role: 'chef',
    });
  });

  it.each(['owner', 'admin', 'chef', 'waiter', 'cashier'] as const)(
    'accepts role "%s"',
    (role) => {
      mockVerify.mockReturnValue({
        sub: 'u1',
        email: 'u@example.com',
        app_metadata: { org_id: 'org1', role },
      });
      const { ctx, reflector } = makeContext({ authorization: 'Bearer token' });
      const guard = new AuthGuard(mockJwtService, reflector);
      expect(guard.canActivate(ctx)).toBe(true);
    },
  );

  describe('@NoOrgRequired', () => {
    it('allows a valid JWT without org claims and attaches BootstrapUserContext', () => {
      mockVerify.mockReturnValue({ sub: 'u1', email: 'new@example.com' });
      const { ctx, reflector, request } = makeContext(
        { authorization: 'Bearer token' },
        { isNoOrgRequired: true },
      );
      const guard = new AuthGuard(mockJwtService, reflector);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(request.bootstrapUser).toEqual<BootstrapUserContext>({
        userId: 'u1',
        email: 'new@example.com',
      });
      expect(request.user).toBeUndefined();
    });

    it('throws 403 when sub is missing even on @NoOrgRequired route', () => {
      mockVerify.mockReturnValue({ email: 'new@example.com' });
      const { ctx, reflector } = makeContext(
        { authorization: 'Bearer token' },
        { isNoOrgRequired: true },
      );
      const guard = new AuthGuard(mockJwtService, reflector);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws 401 when token is missing on @NoOrgRequired route', () => {
      const { ctx, reflector } = makeContext({}, { isNoOrgRequired: true });
      const guard = new AuthGuard(mockJwtService, reflector);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });
});
