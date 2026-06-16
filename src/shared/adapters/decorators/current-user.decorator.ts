import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../../domain/user-context';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UserContext =>
    ctx.switchToHttp().getRequest<{ user: UserContext }>().user,
);
