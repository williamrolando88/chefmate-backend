import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UserRepository } from './domain/user.repository';
import { SupabaseUsersRepository } from './infrastructure/supabase-users.repository';
import { UsersController } from './infrastructure/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UserRepository, useClass: SupabaseUsersRepository },
  ],
})
export class UsersModule {}
