import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('sets isPublic metadata to true on a class', () => {
    @Public()
    class TestController {}

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TestController)).toBe(true);
  });

  it('sets isPublic metadata to true on a method', () => {
    class TestController {
      @Public()
      handler() {}
    }

    const handlerFn = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'handler',
    )?.value as () => void;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handlerFn)).toBe(true);
  });

  it('exports IS_PUBLIC_KEY as "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
