import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerLocation, MediaType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/common/database/prisma.service';
import { RedisService } from 'src/common/config/redis/redis.service';

export class CreateBannerDto {
  title?: string;
  link?: string;
  isActive?: boolean;
  location?: BannerLocation;
  order?: number;
}

@Injectable()
export class BannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private invalidate() {
    return this.redis.delByPattern('banner:*').catch(() => null);
  }

  private async deleteFile(url?: string) {
    if (!url) return;
    try {
      const filename = url.split('/').pop();
      const folder = url.startsWith('video') ? 'videos' : 'images';
      await unlink(join(process.cwd(), 'core', 'uploads', folder, filename!));
    } catch {}
  }

  async getAll() {
    return this.prisma.banner.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }

  async getAdminAll(params: {
    page?: number; limit?: number; id?: number; search?: string;
    isActive?: boolean; location?: BannerLocation; mediaType?: MediaType; createdFrom?: string; createdTo?: string;
  }) {
    const { page = 1, limit = 20, id, search, isActive, location, mediaType, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (id !== undefined) where.id = id;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive;
    if (location) where.location = location;
    if (mediaType) where.mediaType = mediaType;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.banner.findMany({ where, skip, take: limit, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
      this.prisma.banner.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Banner topilmadi');
    return b;
  }

  async create(dto: CreateBannerDto, filename: string, mediaType: MediaType) {
    const mediaUrl = `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`;
    const created = await this.prisma.banner.create({
      data: {
        ...dto,
        mediaUrl,
        mediaType,
        isActive: dto.isActive ?? true,
        location: dto.location ?? BannerLocation.OTHER,
        order: dto.order ?? 0,
      },
    });
    await this.invalidate();
    return created;
  }

  async update(id: number, dto: CreateBannerDto, filename?: string, mediaType?: MediaType) {
    const banner = await this.getById(id);
    let mediaUrl: string | undefined;

    if (filename && mediaType) {
      await this.deleteFile(banner.mediaUrl);
      mediaUrl = `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`;
    }

    const updated = await this.prisma.banner.update({
      where: { id },
      data: { ...dto, ...(mediaUrl ? { mediaUrl, mediaType } : {}) },
    });
    await this.invalidate();
    return updated;
  }

  async updateStatus(id: number, isActive: boolean) {
    await this.getById(id);
    const updated = await this.prisma.banner.update({ where: { id }, data: { isActive } });
    await this.invalidate();
    return updated;
  }

  async delete(id: number) {
    const banner = await this.getById(id);
    await this.deleteFile(banner.mediaUrl);
    await this.prisma.banner.delete({ where: { id } });
    await this.invalidate();
    return { message: 'Banner o\'chirildi' };
  }
}
