import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { BootstrapUserContext } from '../../domain/user-context';
import { BootstrapUser } from './bootstrap-user.decorator';

function extractFactory(decorator: () => ParameterDecorator) {
  class Target {
    handler(@decorator() _value: unknown) {}
  }
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Target,
    'handler',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  return metadata[Object.keys(metadata)[0]].factory;
}

const mockBootstrapUser: BootstrapUserContext = {
  userId: 'u1',
  email: 'new@example.com',
};

function makeContext(bootstrapUser?: BootstrapUserContext) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ bootstrapUser }) }),
  } as unknown as ExecutionContext;
}

describe('BootstrapUser decorator', () => {
  const factory = extractFactory(BootstrapUser);

  it('returns the bootstrapUser attached to the request', () => {
    expect(factory(undefined, makeContext(mockBootstrapUser))).toEqual(
      mockBootstrapUser,
    );
  });

  it('returns undefined when no bootstrapUser is attached', () => {
    expect(factory(undefined, makeContext())).toBeUndefined();
  });
});
