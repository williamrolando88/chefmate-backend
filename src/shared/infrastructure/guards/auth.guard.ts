import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  MEMBERSHIP_ROLES,
  MembershipRole,
  UserContext,
} from '../../domain/user-context';

// Matches the key exported by @Public() in public.decorator.ts
const IS_PUBLIC_KEY = 'isPublic';

const VALID_ROLES = new Set<MembershipRole>([...MEMBERSHIP_ROLES]);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    const payload = this.verifyToken(token);
    (request as Request & { user: UserContext }).user =
      this.toUserContext(payload);
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) return undefined;
    return auth.slice(7);
  }

  private verifyToken(token: string): Record<string, unknown> {
    try {
      return this.jwtService.verify<Record<string, unknown>>(token);
    } catch {
      throw new UnauthorizedException();
    }
  }

  private toUserContext(payload: Record<string, unknown>): UserContext {
    const appMeta = payload['app_metadata'] as
      | Record<string, unknown>
      | undefined;
    const userId = payload['sub'];
    const email = payload['email'];
    const orgId = appMeta?.['org_id'];
    const role = appMeta?.['role'];

    if (
      typeof userId !== 'string' ||
      typeof email !== 'string' ||
      typeof orgId !== 'string' ||
      typeof role !== 'string'
    ) {
      throw new ForbiddenException();
    }

    if (!VALID_ROLES.has(role as MembershipRole)) {
      throw new ForbiddenException();
    }

    const branchIdRaw = appMeta?.['branch_id'];
    return {
      userId,
      email,
      orgId,
      branchId: typeof branchIdRaw === 'string' ? branchIdRaw : null,
      role: role as MembershipRole,
    };
  }
}
