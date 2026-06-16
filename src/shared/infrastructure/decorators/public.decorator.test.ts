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

    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler),
    ).toBe(true);
  });

  it('exports IS_PUBLIC_KEY as "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
