import { Module } from '@nestjs/common';
import { RoleGuardService } from './role_guard.service';

@Module({
  providers: [RoleGuardService],
  exports: [RoleGuardService],
})
export class RoleGuardModule {}
