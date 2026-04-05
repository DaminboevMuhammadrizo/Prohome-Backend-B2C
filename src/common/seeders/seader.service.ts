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
    await this.createSuperAdmin();
  }

  private async createSuperAdmin() {
    try {
      const superAdminPhone =
        this.configService.get<string>('SUPERADMIN_PHONE') || '+998909009090';
      const superAdminPassword =
        this.configService.get<string>('SUPERADMIN_PASSWORD') ||
        'Pr0H0me!Sup3r@2026#X';

      const existingSuperAdmin = await this.prisma.user.findFirst({
        where: { role: UserRole.SUPERADMIN },
      });

      if (existingSuperAdmin) {
        this.logger.log('Superadmin allaqachon mavjud');
        return;
      }

      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: superAdminPhone },
      });

      if (existingUserByPhone) {
        await this.prisma.user.update({
          where: { id: existingUserByPhone.id },
          data: {
            role: UserRole.SUPERADMIN,
            password: await hashPassword(superAdminPassword),
            firstName: existingUserByPhone.firstName || 'Superadmin',
          },
        });

        this.logger.log(
          `Mavjud foydalanuvchi SUPERADMIN qilindi: ${existingUserByPhone.id}`,
        );
        return;
      }

      const superAdmin = await this.prisma.user.create({
        data: {
          firstName: 'Superadmin',
          phone: superAdminPhone,
          role: UserRole.SUPERADMIN,
          password: await hashPassword(superAdminPassword),
        },
      });

      this.logger.log(`SUPERADMIN yaratildi: ${superAdmin.id}`);
    } catch (error) {
      this.logger.error('Superadmin seed xatoligi', error);
      throw error;
    }
  }
}
