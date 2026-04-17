import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../config/bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UZBEKISTAN_REGIONS } from './region.seed';

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
    await this.seedRegions();
  }

  private async seedRegions() {
    try {
      for (const region of UZBEKISTAN_REGIONS) {
        let parent = await this.prisma.region.findFirst({
          where: { nameUz: region.nameUz, parentId: null },
        });

        if (!parent) {
          parent = await this.prisma.region.create({
            data: {
              nameUz: region.nameUz,
              nameUzCyrl: region.nameUzCyrl,
              nameRu: region.nameRu,
            },
          });
        }

        for (const d of region.districts) {
          const exists = await this.prisma.region.findFirst({
            where: { nameUz: d.nameUz, parentId: parent.id },
          });

          if (!exists) {
            await this.prisma.region.create({
              data: {
                nameUz: d.nameUz,
                nameUzCyrl: d.nameUzCyrl,
                nameRu: d.nameRu,
                parentId: parent.id,
              },
            });
          }
        }
      }

      this.logger.log("O'zbekiston viloyat va tumanlari seed qilindi");
    } catch (error) {
      this.logger.error('Region seed xatoligi', error);
      throw error;
    }
  }

  private async createAdmin() {
    try {
      const adminPhone =
        this.configService.get<string>('ADMIN_PHONE') ?? '+998901234567';
      const adminPassword =
        this.configService.get<string>('ADMIN_PASSWORD') ?? 'Admin123';
      const adminRoleValue =
        this.configService.get<string>('ADMIN_ROLE') ?? UserRole.SUPERADMIN;
      const adminRole =
        adminRoleValue === UserRole.ADMIN ? UserRole.ADMIN : UserRole.SUPERADMIN;

      const existingAdmin = await this.prisma.user.findUnique({
        where: { phone: adminPhone },
      });

      if (existingAdmin) {
        this.logger.log(`Admin allaqachon mavjud: ${adminPhone}`);
        return;
      }

      const admin = await this.prisma.user.create({
        data: {
          firstName: 'Admin',
          phone: adminPhone,
          role: adminRole,
          password: await hashPassword(adminPassword),
        },
      });

      this.logger.log(
        `Seed admin yaratildi: phone=${adminPhone}, password=${adminPassword}, role=${adminRole}, id=${admin.id}`,
      );
    } catch (error) {
      this.logger.error('Admin seed xatoligi', error);
      throw error;
    }
  }
}
