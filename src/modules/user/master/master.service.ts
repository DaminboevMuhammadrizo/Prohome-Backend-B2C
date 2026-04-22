import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { PhoneIdentityService } from 'src/common/services/phone-identity.service';
import { SchemaCompatibilityService } from 'src/common/services/schema-compatibility.service';
import { buildMasterProfileSelect } from 'src/common/utils/master-profile-select.util';
import { buildDateRange, normalizeSearch } from 'src/common/utils/query.util';
import { CreateMasterDto } from './dto/create-master.dto';
import { MasterQueryDto } from './dto/master-query.dto';
import { MasterStatusDto } from './dto/master-status.dto';
import { UpdateMasterDto } from './dto/update-master.dto';

@Injectable()
export class MasterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneIdentity: PhoneIdentityService,
    private readonly schemaCompatibility: SchemaCompatibilityService,
  ) {}

  private buildWhere(query: MasterQueryDto): Prisma.MasterProfileWhereInput {
    const search = normalizeSearch(query.search);

    return {
      isAvailable: query.isAvailable,
      experience: {
        gte: query.minExperience,
        lte: query.maxExperience,
      },
      salary: {
        gte: query.minSalary,
        lte: query.maxSalary,
      },
      createdAt: buildDateRange(query.createdFrom, query.createdTo),
      user: {
        regionId: query.regionId,
        isBlocked: query.isBlocked,
      },
      categories: query.categoryId
        ? { some: { jobCategoryId: query.categoryId } }
        : undefined,
      OR: search
        ? [
            { bio: { contains: search, mode: 'insensitive' } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
  }

  private async ensureCategories(categoryIds: number[]) {
    if (!categoryIds.length) return;

    const found = await this.prisma.jobCategory.findMany({
      where: { id: { in: categoryIds }, isArchived: false },
    });

    if (found.length !== new Set(categoryIds).size) {
      throw new NotFoundException('Job categorylardan biri topilmadi');
    }
  }

  private async findMasterOrThrow(id: number) {
    const master = await this.prisma.masterProfile.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!master) {
      throw new NotFoundException('Usta topilmadi');
    }

    return master;
  }

  async getAll(query: MasterQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const canUseSalaryType =
      await this.schemaCompatibility.hasMasterProfileSalaryType();
    const where = this.buildWhere(query);

    const [data, total] = await Promise.all([
      this.prisma.masterProfile.findMany({
        where,
        select: buildMasterProfileSelect(canUseSalaryType, {
          includeUser: true,
          includeUserPhone: true,
          includeUserStatus: true,
          includeUserRegion: true,
          includeCategories: true,
          includeCounts: true,
        }),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterProfile.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const canUseSalaryType =
      await this.schemaCompatibility.hasMasterProfileSalaryType();

    const master = await this.prisma.masterProfile.findUnique({
      where: { id },
      select: buildMasterProfileSelect(canUseSalaryType, {
        includeUser: true,
        includeUserPhone: true,
        includeUserStatus: true,
        includeUserRegion: true,
        includeCategories: true,
        includeRatings: true,
        includeCounts: true,
      }),
    });

    if (!master) {
      throw new NotFoundException('Usta topilmadi');
    }

    return master;
  }

  async create(dto: CreateMasterDto) {
    const phone = await this.phoneIdentity.ensurePhoneAvailable({ phone: dto.phone });

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
      if (!region) throw new NotFoundException('Region topilmadi');
    }

    await this.ensureCategories(dto.categoryIds);

    const canUseSalaryType =
      await this.schemaCompatibility.hasMasterProfileSalaryType();

    const user = await this.prisma.user.create({
      data: {
        phone,
        password: await hashPassword(dto.password),
        firstName: dto.firstName,
        lastName: dto.lastName,
        regionId: dto.regionId,
        masterProfile: {
          create: {
            experience: dto.experience,
            bio: dto.bio,
            skills: dto.skills ?? [],
            portfolios: dto.portfolios ?? [],
            telegramUrl: dto.telegramUrl,
            instagramUrl: dto.instagramUrl,
            youtubeUrl: dto.youtubeUrl,
            facebookUrl: dto.facebookUrl,
            tiktokUrl: dto.tiktokUrl,
            websiteUrl: dto.websiteUrl,
            isAvailable: dto.isAvailable ?? true,
            salary: dto.salary,
            ...(canUseSalaryType ? { salaryType: dto.salaryType } : {}),
            categories: {
              create: dto.categoryIds.map((jobCategoryId) => ({ jobCategoryId })),
            },
          },
        },
      },
      include: {
        masterProfile: {
          select: buildMasterProfileSelect(canUseSalaryType, {
            includeCategories: true,
          }),
        },
        region: true,
      },
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async update(id: number, dto: UpdateMasterDto) {
    const master = await this.findMasterOrThrow(id);

    if (dto.phone) {
      await this.phoneIdentity.ensurePhoneAvailable({
        phone: dto.phone,
        excludeUserId: master.userId,
      });
    }

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
      if (!region) throw new NotFoundException('Region topilmadi');
    }

    if (dto.categoryIds?.length) {
      await this.ensureCategories(dto.categoryIds);
    }

    const canUseSalaryType =
      await this.schemaCompatibility.hasMasterProfileSalaryType();

    const [, updatedMaster] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: master.userId },
        data: {
          ...(dto.phone ? { phone: this.phoneIdentity.normalizePhone(dto.phone) } : {}),
          ...(dto.password ? { password: await hashPassword(dto.password) } : {}),
          firstName: dto.firstName,
          lastName: dto.lastName,
          regionId: dto.regionId,
        },
      }),
      this.prisma.masterProfile.update({
        where: { id },
        data: {
          experience: dto.experience,
          bio: dto.bio,
          skills: dto.skills,
          portfolios: dto.portfolios,
          telegramUrl: dto.telegramUrl,
          instagramUrl: dto.instagramUrl,
          youtubeUrl: dto.youtubeUrl,
          facebookUrl: dto.facebookUrl,
          tiktokUrl: dto.tiktokUrl,
          websiteUrl: dto.websiteUrl,
          isAvailable: dto.isAvailable,
          salary: dto.salary,
          ...(canUseSalaryType ? { salaryType: dto.salaryType } : {}),
          ...(dto.categoryIds
            ? {
                categories: {
                  deleteMany: {},
                  create: dto.categoryIds.map((jobCategoryId) => ({ jobCategoryId })),
                },
              }
            : {}),
        },
        select: buildMasterProfileSelect(canUseSalaryType, {
          includeUser: true,
          includeUserPhone: true,
          includeUserStatus: true,
          includeUserRegion: true,
          includeCategories: true,
        }),
      }),
    ]);

    return updatedMaster;
  }

  async toggleStatus(id: number, dto: MasterStatusDto) {
    const master = await this.findMasterOrThrow(id);

    const updates: Array<Promise<unknown>> = [];

    if (dto.isAvailable !== undefined) {
      updates.push(
        this.prisma.masterProfile.update({
          where: { id },
          data: { isAvailable: dto.isAvailable },
        }),
      );
    }

    if (dto.isBlocked !== undefined) {
      updates.push(
        this.prisma.user.update({
          where: { id: master.userId },
          data: {
            isBlocked: dto.isBlocked,
            blockedAt: dto.isBlocked ? new Date() : null,
          },
        }),
      );
    }

    await Promise.all(updates);

    return this.getOne(id);
  }

  async delete(id: number) {
    const master = await this.findMasterOrThrow(id);
    await this.prisma.user.delete({ where: { id: master.userId } });
    return { message: 'Usta muvaffaqiyatli o\'chirildi' };
  }
}
