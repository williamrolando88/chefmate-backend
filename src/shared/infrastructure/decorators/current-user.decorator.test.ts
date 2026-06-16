import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { UserContext } from '../../domain/user-context';
import { CurrentUser } from './current-user.decorator';

function extractFactory(decorator: (...args: unknown[]) => unknown) {
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

const mockUser: UserContext = {
  userId: 'u1',
  email: 'chef@example.com',
  orgId: 'org1',
  branchId: 'branch1',
  role: 'chef',
};

function makeContext(user?: UserContext) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const factory = extractFactory(CurrentUser);

  it('returns the user attached to the request', () => {
    expect(factory(undefined, makeContext(mockUser))).toEqual(mockUser);
  });

  it('returns undefined when no user is attached', () => {
    expect(factory(undefined, makeContext())).toBeUndefined();
  });
});
