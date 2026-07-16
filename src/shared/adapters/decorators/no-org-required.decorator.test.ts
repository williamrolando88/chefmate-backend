import {
  IS_NO_ORG_REQUIRED_KEY,
  NoOrgRequired,
} from './no-org-required.decorator';

describe('NoOrgRequired decorator', () => {
  it('sets isNoOrgRequired metadata to true on a class', () => {
    @NoOrgRequired()
    class TestController {}

    expect(Reflect.getMetadata(IS_NO_ORG_REQUIRED_KEY, TestController)).toBe(
      true,
    );
  });

  it('sets isNoOrgRequired metadata to true on a method', () => {
    class TestController {
      @NoOrgRequired()
      handler() {}
    }

    const handlerFn = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'handler',
    )?.value as () => void;
    expect(Reflect.getMetadata(IS_NO_ORG_REQUIRED_KEY, handlerFn)).toBe(true);
  });

  it('exports IS_NO_ORG_REQUIRED_KEY as "isNoOrgRequired"', () => {
    expect(IS_NO_ORG_REQUIRED_KEY).toBe('isNoOrgRequired');
  });
});
