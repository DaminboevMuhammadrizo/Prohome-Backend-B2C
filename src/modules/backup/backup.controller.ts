import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { BackupService } from './backup.service';

@ApiTags('Backup (Admin)')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.SUPERADMIN)
@Controller('backup')
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Backup sozlanganmi va oxirgi qachon yuborilgani' })
  async status() {
    const state = await this.prisma.backupState.findUnique({ where: { id: 1 } });
    return { enabled: this.backupService.isEnabled(), lastBackupAt: state?.lastBackupAt ?? null };
  }

  @Post('run')
  @ApiOperation({
    summary: 'Backup\'ni hoziroq qo\'lda ishga tushirish',
    description: 'Har 3 kunlik avtomatik jarayonni kutmasdan sinab ko\'rish uchun. Guruhdagi avvalgi backup xabari avtomatik o\'chiriladi.',
  })
  run() {
    return this.backupService.runBackup();
  }
}
