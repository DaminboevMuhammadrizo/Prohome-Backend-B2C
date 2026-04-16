import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InteractionBufferService } from 'src/common/interactions/interaction-buffer.service';
import { SchemaCompatibilityService } from 'src/common/services/schema-compatibility.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertAdmin } from 'src/common/utils/access.util';
import { buildMasterProfileSelect } from 'src/common/utils/master-profile-select.util';
import { buildDateRange, normalizeSearch } from 'src/common/utils/query.util';
import { CreateMasterProfileDto } from './dto/create-master-profile.dto';
import { MasterProfileQueryDto } from './dto/master-profile-query.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';

@Injectable()
export class MasterProfileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly interactionBuffer: InteractionBufferService,
        private readonly schemaCompatibility: SchemaCompatibilityService,
    ) { }

    private async ensureCategories(categoryIds?: number[]) {
        if (!categoryIds?.length) {
            return;
        }

        const categories = await this.prisma.jobCategory.findMany({
            where: {
                id: { in: categoryIds },
                isArchived: false,
            },
        });

        if (categories.length !== new Set(categoryIds).size) {
            throw new NotFoundException('Job categorylardan biri topilmadi');
        }
    }

    private decorateProfile<
        T extends { id: number; savedCount: number; viewCount: number }
    >(profile: T) {
        return {
            ...profile,
            savedCount: profile.savedCount + this.interactionBuffer.getPendingMasterSaveCount(profile.id),
            viewCount: profile.viewCount + this.interactionBuffer.getPendingMasterViewCount(profile.id),
        };
    }

    private buildWhere(
        query: MasterProfileQueryDto,
        canUseSalaryType: boolean,
    ): Prisma.MasterProfileWhereInput {
        const search = normalizeSearch(query.search);
        const requestType = query.requestType ?? 'MASTER';

        return {
            isAvailable:
                requestType === 'PARTNER'
                    ? true
                    : query.isAvailable,
            experience: {
                gte: query.minExperience,
                lte: query.maxExperience,
            },
            salary: {
                gte: query.minSalary,
                lte: query.maxSalary,
            },
            ...(canUseSalaryType ? { salaryType: query.salaryType } : {}),
            createdAt: buildDateRange(query.createdFrom, query.createdTo),
            user: {
                regionId: query.regionId,
            },
            categories: query.categoryId
                ? {
                    some: {
                        jobCategoryId: query.categoryId,
                    },
                }
                : undefined,
            OR: search
                ? [
                    { bio: { contains: search, mode: 'insensitive' } },
                    {
                        user: {
                            firstName: { contains: search, mode: 'insensitive' },
                        },
                    },
                    {
                        user: {
                            lastName: { contains: search, mode: 'insensitive' },
                        },
                    },
                    {
                        user: {
                            phone: { contains: search, mode: 'insensitive' },
                        },
                    },
                    {
                        categories: {
                            some: {
                                jobCategory: {
                                    OR: [
                                        { nameUz: { contains: search, mode: 'insensitive' } },
                                        { nameUzCyrl: { contains: search, mode: 'insensitive' } },
                                        { nameRu: { contains: search, mode: 'insensitive' } },
                                    ],
                                },
                            },
                        },
                    },
                ]
                : undefined,
        };
    }

    private async getBrokenMasterProfileIds(): Promise<number[]> {
        const rows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
            SELECT mp.id
            FROM master_profiles mp
            LEFT JOIN "User" u ON u.id = mp."userId"
            WHERE u.id IS NULL
        `);

        return rows.map((row) => row.id);
    }

    private async buildSafeWhere(
        query: MasterProfileQueryDto,
        canUseSalaryType: boolean,
    ): Promise<Prisma.MasterProfileWhereInput> {
        const where = this.buildWhere(query, canUseSalaryType);
        const brokenIds = await this.getBrokenMasterProfileIds();

        if (!brokenIds.length) {
            return where;
        }

        return {
            AND: [
                where,
                {
                    id: {
                        notIn: brokenIds,
                    },
                },
            ],
        };
    }

    private async ensureProfileHasUser(id: number): Promise<void> {
        const rows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
            SELECT mp.id
            FROM master_profiles mp
            LEFT JOIN "User" u ON u.id = mp."userId"
            WHERE mp.id = ${id}
              AND u.id IS NULL
        `);

        if (rows.length) {
            throw new NotFoundException('Master profile foydalanuvchi bilan bog‘lanmagan');
        }
    }

    async getAll(query: MasterProfileQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const canUseSalaryType =
            await this.schemaCompatibility.hasMasterProfileSalaryType();
        const where = await this.buildSafeWhere(query, canUseSalaryType);

        const [data, total] = await Promise.all([
            this.prisma.masterProfile.findMany({
                where,
                select: buildMasterProfileSelect(canUseSalaryType, {
                    includeUser: true,
                    includeUserPhone: true,
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
            data: data.map((profile) => this.decorateProfile(profile)),
            requestType: query.requestType ?? 'MASTER',
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getOne(id: number) {
        await this.ensureProfileHasUser(id);
        const canUseSalaryType =
            await this.schemaCompatibility.hasMasterProfileSalaryType();
        const profile = await this.prisma.masterProfile.findUnique({
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

        if (!profile) {
            throw new NotFoundException('Master profile topilmadi');
        }

        return this.decorateProfile(profile);
    }

    async getMyProfile(user: AuthUser) {
        const canUseSalaryType =
            await this.schemaCompatibility.hasMasterProfileSalaryType();
        const profile = await this.prisma.masterProfile.findUnique({
            where: { userId: user.id },
            select: buildMasterProfileSelect(canUseSalaryType, {
                includeCategories: true,
                includeRatings: true,
                includeCounts: true,
            }),
        });

        if (!profile) {
            throw new NotFoundException('Sizda master profile yo‘q');
        }

        return this.decorateProfile(profile);
    }

    async create(user: AuthUser, dto: CreateMasterProfileDto) {
        const existingProfile = await this.prisma.masterProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
        });

        if (existingProfile) {
            throw new ConflictException('Master profile allaqachon mavjud');
        }

        await this.ensureCategories(dto.categoryIds);

        const canUseSalaryType =
            await this.schemaCompatibility.hasMasterProfileSalaryType();

        return this.prisma.masterProfile.create({
            data: {
                bio: dto.bio,
                experience: dto.experience,
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
                userId: user.id,
                categories: {
                    create: dto.categoryIds.map((jobCategoryId) => ({
                        jobCategoryId,
                    })),
                },
            },
            select: buildMasterProfileSelect(canUseSalaryType, {
                includeCategories: true,
            }),
        });
    }

    async update(user: AuthUser, dto: UpdateMasterProfileDto) {
        const profile = await this.prisma.masterProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
        });

        if (!profile) {
            throw new NotFoundException('Sizda master profile yo‘q');
        }

        await this.ensureCategories(dto.categoryIds);

        const canUseSalaryType =
            await this.schemaCompatibility.hasMasterProfileSalaryType();

        return this.prisma.masterProfile.update({
            where: { userId: user.id },
            data: {
                bio: dto.bio,
                experience: dto.experience,
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
                categories: dto.categoryIds
                    ? {
                        deleteMany: {},
                        create: dto.categoryIds.map((jobCategoryId) => ({
                            jobCategoryId,
                        })),
                    }
                    : undefined,
            },
            select: buildMasterProfileSelect(canUseSalaryType, {
                includeCategories: true,
            }),
        });
    }

    async delete(user: AuthUser) {
        await this.getMyProfile(user);
        return this.prisma.masterProfile.delete({
            where: { userId: user.id },
        });
    }

    async toggleSave(id: number, user: AuthUser) {
        const profile = await this.prisma.masterProfile.findUnique({
            where: { id },
            select: { id: true, userId: true },
        });

        if (!profile) {
            throw new NotFoundException('Master profile topilmadi');
        }

        if (profile.userId === user.id) {
            throw new ForbiddenException('O‘zingizni saqlay olmaysiz');
        }

        return this.interactionBuffer.toggleMasterSave(user.id, id);
    }

    async getInteractionState(id: number, user: AuthUser) {
        await this.getOne(id);
        const [saved, contacted] = await Promise.all([
            this.prisma.masterProfileSave.findUnique({
                where: {
                    userId_masterProfileId: {
                        userId: user.id,
                        masterProfileId: id,
                    },
                },
            }),
            this.prisma.masterProfileContact.findUnique({
                where: {
                    userId_masterProfileId: {
                        userId: user.id,
                        masterProfileId: id,
                    },
                },
            }),
        ]);

        return {
            savedByMe: Boolean(saved) || this.interactionBuffer.hasPendingMasterSave(user.id, id),
            contactedByMe: Boolean(contacted),
        };
    }

    async addView(id: number, user?: AuthUser) {
        await this.getOne(id);
        await this.interactionBuffer.addMasterView(user?.id ?? null, id);
        return { message: 'View qabul qilindi' };
    }

    async markContact(id: number, user: AuthUser) {
        const profile = await this.prisma.masterProfile.findUnique({
            where: { id },
            select: { id: true, userId: true },
        });

        if (!profile) {
            throw new NotFoundException('Master profile topilmadi');
        }

        if (profile.userId === user.id) {
            throw new ForbiddenException('O‘zingiz bilan bog‘lanish yozuvini qoldira olmaysiz');
        }

        const existingContact = await this.prisma.masterProfileContact.findUnique({
            where: {
                userId_masterProfileId: {
                    userId: user.id,
                    masterProfileId: id,
                },
            },
        });

        if (existingContact) {
            return { message: 'Bog‘lanish avval yozilgan', contactRecorded: false };
        }

        await this.prisma.$transaction([
            this.prisma.masterProfileContact.create({
                data: {
                    userId: user.id,
                    masterProfileId: id,
                },
            }),
            this.prisma.masterProfile.update({
                where: { id },
                data: {
                    contactCount: {
                        increment: 1,
                    },
                },
            }),
        ]);

        return { message: 'Bog‘lanish yozuvi saqlandi', contactRecorded: true };
    }

    async getViewers(id: number, user: AuthUser, pagination: PaginationDto) {
        assertAdmin(user);
        await this.getOne(id);

        const page = pagination.page ?? 1;
        const limit = pagination.limit ?? 10;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.masterProfileView.findMany({
                where: { masterProfileId: id },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.masterProfileView.count({
                where: { masterProfileId: id },
            }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
