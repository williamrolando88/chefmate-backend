import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { BootstrapUserContext } from '../../domain/user-context';

export const BootstrapUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): BootstrapUserContext =>
    ctx.switchToHttp().getRequest<{ bootstrapUser: BootstrapUserContext }>()
      .bootstrapUser,
);
