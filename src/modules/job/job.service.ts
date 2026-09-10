import { ChangeJobStatusDto, CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { JobStatus, SearchType } from '@prisma/client';
import { NotificationService } from 'src/modules/notification/notification.service';
import { RedisService } from 'src/common/config/redis/redis.service';
import { CACHE_TTL, cacheKey } from 'src/common/config/redis/cache.constants';

const CACHE_NS = 'job';

@Injectable()
export class JobService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationService: NotificationService,
        private readonly redis: RedisService,
    ) { }

    private invalidateCache() {
        return this.redis.delByPattern(`${CACHE_NS}:*`).catch(() => null);
    }

    private jobSelect = {
        id: true,
        title: true,
        description: true,
        price: true,
        contactPhone: true,
        status: true,
        viewCount: true,
        likeCount: true,
        locationId: true,
        isRemote: true,
        address: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        location: { select: { id: true, name: true, type: true } },
        skillType: { select: { id: true, name: true } },
        skills: { include: { skill: { select: { id: true, name: true } } } },
        _count: { select: { likes: true, views: true } },
    };

    async getAll(params: {
        page?: number; limit?: number; search?: string; status?: JobStatus; skillTypeId?: number; locationId?: number; subscriberUserId?: number;
        id?: number; userId?: number; minPrice?: number; maxPrice?: number; createdFrom?: string; createdTo?: string;
        isRemote?: boolean; swLat?: number; swLng?: number; neLat?: number; neLng?: number;
    }) {
        const { page = 1, limit = 20, search, status, skillTypeId, locationId, subscriberUserId, id, userId, minPrice, maxPrice, createdFrom, createdTo, isRemote, swLat, swLng, neLat, neLng } = params;
        const skip = (page - 1) * limit;
        const where: any = {};

        if (id !== undefined) where.id = id;
        if (userId !== undefined) where.userId = userId;
        if (search) where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { contactPhone: { contains: search, mode: 'insensitive' } },
        ];
        if (status) where.status = status;
        else where.status = JobStatus.OPEN;
        if (skillTypeId) where.skillTypeId = skillTypeId;
        if (locationId) where.locationId = locationId;
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined) where.price.gte = minPrice;
            if (maxPrice !== undefined) where.price.lte = maxPrice;
        }
        if (createdFrom || createdTo) {
            where.createdAt = {};
            if (createdFrom) where.createdAt.gte = new Date(createdFrom);
            if (createdTo) where.createdAt.lte = new Date(createdTo);
        }
        if (isRemote !== undefined) where.isRemote = isRemote;
        if (swLat !== undefined && swLng !== undefined && neLat !== undefined && neLng !== undefined) {
            where.latitude = { gte: swLat, lte: neLat };
            where.longitude = { gte: swLng, lte: neLng };
        }

        const key = cacheKey(CACHE_NS, 'list', {
            page, limit, search, status, skillTypeId, locationId, id, userId,
            minPrice, maxPrice, createdFrom, createdTo, isRemote, swLat, swLng, neLat, neLng,
        });
        const result = await this.redis.wrap(key, CACHE_TTL, async () => {
            const [data, total] = await Promise.all([
                this.prisma.job.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: this.jobSelect }),
                this.prisma.job.count({ where }),
            ]);
            return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
        });

        if (result.data.length === 0 && (search || skillTypeId || locationId)) {
            this.notificationService.recordEmptySearch(SearchType.JOB, { search, skillTypeId, locationId }, locationId, subscriberUserId);
        }

        return result;
    }

    async getById(id: number) {
        return this.redis.wrap(cacheKey(CACHE_NS, 'item', id), CACHE_TTL, async () => {
            const job = await this.prisma.job.findUnique({ where: { id }, select: this.jobSelect });
            if (!job) throw new NotFoundException('Ish e\'loni topilmadi');
            return job;
        });
    }


    async create(userId: number, dto: CreateJobDto) {
        const skillType = await this.prisma.skillType.findUnique({ where: { id: dto.skillTypeId } });
        if (!skillType) throw new NotFoundException('Skill turi topilmadi');

        if (dto.locationId) {
            const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
            if (!loc) throw new NotFoundException('Joylashuv topilmadi');
        }

        const job = await this.prisma.job.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                contactPhone: dto.contactPhone,
                userId,
                locationId: dto.locationId,
                skillTypeId: dto.skillTypeId,
                isRemote: dto.isRemote ?? false,
                address: dto.isRemote ? undefined : dto.address,
                latitude: dto.isRemote ? undefined : dto.latitude,
                longitude: dto.isRemote ? undefined : dto.longitude,
            },
        });

        if (dto.skillIds?.length) {
            await this.prisma.jobSkills.createMany({
                data: dto.skillIds.map((skillId) => ({ jobId: job.id, skillId })),
                skipDuplicates: true,
            });
        }

        await this.invalidateCache();
        const created = await this.getById(job.id);
        this.notificationService.matchAndNotify(SearchType.JOB, created).catch(() => null);
        return created;
    }

    async update(id: number, userId: number, isAdmin: boolean, dto: UpdateJobDto) {
        const job = await this.getById(id);
        if (!isAdmin && (job as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');

        if (dto.skillIds !== undefined) {
            await this.prisma.jobSkills.deleteMany({ where: { jobId: id } });
            if (dto.skillIds.length > 0) {
                await this.prisma.jobSkills.createMany({
                    data: dto.skillIds.map((skillId) => ({ jobId: id, skillId })),
                    skipDuplicates: true,
                });
            }
        }

        const { skillIds, ...rest } = dto;
        await this.prisma.job.update({ where: { id }, data: rest });
        await this.invalidateCache();
        return this.getById(id);
    }

    async changeStatus(id: number, userId: number, isAdmin: boolean, dto: ChangeJobStatusDto) {
        const job = await this.getById(id);
        if (!isAdmin && (job as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
        const updated = await this.prisma.job.update({ where: { id }, data: { status: dto.status }, select: this.jobSelect });
        await this.invalidateCache();
        return updated;
    }

    async delete(id: number, userId: number, isAdmin: boolean) {
        const job = await this.getById(id);
        if (!isAdmin && (job as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
        await this.prisma.job.delete({ where: { id } });
        await this.invalidateCache();
        return { message: 'Ish e\'loni o\'chirildi' };
    }

    async toggleLike(id: number, userId: number) {
        await this.getById(id);
        const existing = await this.prisma.jobLike.findUnique({ where: { userId_jobId: { userId, jobId: id } } });

        if (existing) {
            await this.prisma.jobLike.delete({ where: { id: existing.id } });
            const updated = await this.prisma.job.update({ where: { id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
            return { liked: false, likeCount: updated.likeCount };
        } else {
            await this.prisma.jobLike.create({ data: { userId, jobId: id } });
            const updated = await this.prisma.job.update({ where: { id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
            return { liked: true, likeCount: updated.likeCount };
        }
    }

    async recordView(id: number, userId: number) {
        const existing = await this.prisma.jobView.findUnique({ where: { userId_jobId: { userId, jobId: id } } });
        if (existing)
            await this.prisma.jobView.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
        else {
            await this.prisma.jobView.create({ data: { userId, jobId: id, count: 1 } });
            await this.prisma.job.update({ where: { id }, data: { viewCount: { increment: 1 } } });
        }
        const job = await this.prisma.job.findUnique({ where: { id }, select: { viewCount: true } });
        return { viewCount: job?.viewCount ?? 0 };
    }
}
