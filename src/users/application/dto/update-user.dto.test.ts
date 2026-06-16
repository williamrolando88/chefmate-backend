import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('accepts an empty body (all fields optional)', async () => {
    const dto = new UpdateUserDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid string fields', async () => {
    const dto = Object.assign(new UpdateUserDto(), {
      firstName: 'John',
      lastName: 'Doe',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid URL for avatarUrl', async () => {
    const dto = Object.assign(new UpdateUserDto(), {
      avatarUrl: 'https://example.com/avatar.png',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-URL string for avatarUrl', async () => {
    const dto = Object.assign(new UpdateUserDto(), { avatarUrl: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'avatarUrl')).toBe(true);
  });
});
