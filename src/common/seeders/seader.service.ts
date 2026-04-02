import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../config/bcrypt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedMinimal();
  }

  private async seedMinimal() {
    await this.createAdmin();
  }

  private async createAdmin() {
    try {
      const adminPhone = this.configService.get<string>('ADMIN_PHONE');
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

      if (!adminPhone || !adminPassword) {
        this.logger.warn(
          'ADMIN_PHONE yoki ADMIN_PASSWORD topilmadi, admin seed o‘tkazib yuborildi',
        );
        return;
      }

      const existingAdmin = await this.prisma.user.findUnique({
        where: { phone: adminPhone },
      });

      if (existingAdmin) {
        this.logger.log('Admin allaqachon mavjud');
        return;
      }

      const admin = await this.prisma.user.create({
        data: {
          firstName: 'Admin',
          phone: adminPhone,
          role: UserRole.ADMIN,
          password: await hashPassword(adminPassword),
        },
      });

      this.logger.log(`Admin yaratildi: ${admin.id}`);
    } catch (error) {
      this.logger.error('Admin seed xatoligi', error);
      throw error;
    }
  }
}
