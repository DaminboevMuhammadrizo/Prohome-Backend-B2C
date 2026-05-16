import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationType, SkillStatus, UserRole, UserStatus } from '@prisma/client';
import { hashPassword } from '../config/bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CENTRAL_ASIA_LOCATIONS, RUSSIA_LOCATIONS } from './location.seed';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
    await this.seedLocations();
    await this.seedSkillTypes();
  }

  private async seedSuperAdmin() {
    try {
      const phone = this.config.get<string>('SUPERADMIN_PHONE') ?? '+998909009090';
      const password = this.config.get<string>('SUPERADMIN_PASSWORD') ?? 'Admin123!';

      const existing = await this.prisma.user.findFirst({ where: { role: UserRole.SUPERADMIN } });
      if (existing) {
        this.logger.log('Superadmin mavjud');
        return;
      }

      await this.prisma.user.create({
        data: {
          phone,
          firstName: 'Super',
          lastName: 'Admin',
          role: UserRole.SUPERADMIN,
          status: UserStatus.ACTIVE,
          password: await hashPassword(password),
        },
      });

      this.logger.log(`Superadmin yaratildi: ${phone}`);
    } catch (e) {
      this.logger.error('Superadmin seed xatoligi', e);
    }
  }

  private async seedLocations() {
    try {
      const existing = await this.prisma.location.count();
      if (existing > 0) {
        this.logger.log('Joylashuvlar allaqachon mavjud');
        return;
      }

      const allGroups = [...CENTRAL_ASIA_LOCATIONS, ...RUSSIA_LOCATIONS];

      for (const group of allGroups) {
        const country = await this.prisma.location.create({
          data: { name: group.country, type: LocationType.COUNTRY },
        });

        for (const reg of group.regions) {
          const region = await this.prisma.location.create({
            data: { name: reg.name, type: LocationType.REGION, parentId: country.id },
          });

          if (reg.cities && reg.cities.length > 0) {
            const cityData = reg.cities.map((c) => ({
              name: c,
              type: LocationType.CITY,
              parentId: region.id,
            }));

            // Batch insert
            for (let i = 0; i < cityData.length; i += 10) {
              await this.prisma.location.createMany({
                data: cityData.slice(i, i + 10),
                skipDuplicates: true,
              });
            }
          }
        }
      }

      this.logger.log('Joylashuvlar seed qilindi (Markaziy Osiyo + Rossiya)');
    } catch (e) {
      this.logger.error('Location seed xatoligi', e);
    }
  }

  private async seedSkillTypes() {
    try {
      const existing = await this.prisma.skillType.count();
      if (existing > 0) {
        this.logger.log('Skill turlari allaqachon mavjud');
        return;
      }

      const types = [
        { name: 'Qurilish ishlari', skills: ['Plitkachilik', 'Gipsokarton', 'Suvash', 'Bo\'yash', 'Pol yotqizish'] },
        { name: 'Muhandislik', skills: ['Santexnik', 'Elektrik', 'Gaz o\'rnatish', 'Konditsioner'] },
        { name: 'Duradgorlik', skills: ['Mebel yasash', 'Eshik-deraza', 'Parket'] },
        { name: 'Umumiy ta\'mir', skills: ['Ta\'mirlash', 'Ko\'chirish', 'Tozalash'] },
      ];

      for (const t of types) {
        const skillType = await this.prisma.skillType.create({
          data: { name: t.name, status: SkillStatus.ACTIVE },
        });

        await this.prisma.skills.createMany({
          data: t.skills.map((s) => ({ name: s, status: SkillStatus.ACTIVE, typeId: skillType.id })),
          skipDuplicates: true,
        });
      }

      this.logger.log('Skill turlari seed qilindi');
    } catch (e) {
      this.logger.error('SkillType seed xatoligi', e);
    }
  }
}
