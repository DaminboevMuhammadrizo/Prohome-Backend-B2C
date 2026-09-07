import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DealType, MediaType, PropertyType, RealEstateStatus, SearchType, SellerType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/common/database/prisma.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { ChangeRealEstateStatusDto, CreateRealEstateDto, UpdateRealEstateDto } from './dto/real-estate.dto';

@Injectable()
export class RealEstateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private select = {
    id: true,
    title: true,
    description: true,
    price: true,
    propertyType: true,
    dealType: true,
    sellerType: true,
    contactPhone: true,
    companyName: true,
    companyLogo: true,
    areaSize: true,
    roomCount: true,
    floor: true,
    totalFloors: true,
    plotSize: true,
    viewCount: true,
    likeCount: true,
    status: true,
    locationId: true,
    createdAt: true,
    updatedAt: true,
    location: { select: { id: true, name: true, type: true, parent: { select: { id: true, name: true } } } },
    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
    media: { orderBy: { isMain: 'desc' as const } },
  };

  async getAll(params: {
    page?: number;
    limit?: number;
    id?: number;
    search?: string;
    propertyType?: PropertyType;
    dealType?: DealType;
    sellerType?: SellerType;
    locationId?: number;
    minPrice?: number;
    maxPrice?: number;
    roomCount?: number;
    status?: RealEstateStatus;
    userId?: number;
    subscriberUserId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const { page = 1, limit = 20, id, search, propertyType, dealType, sellerType, locationId, minPrice, maxPrice, roomCount, status, userId, subscriberUserId, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;

    const where: any = userId ? {} : { status: status || RealEstateStatus.ACTIVE };
    if (userId) { where.userId = userId; if (status) where.status = status; }

    if (id !== undefined) where.id = id;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { contactPhone: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
    ];
    if (propertyType) where.propertyType = propertyType;
    if (dealType) where.dealType = dealType;
    if (sellerType) where.sellerType = sellerType;
    if (locationId) where.locationId = locationId;
    if (roomCount) where.roomCount = roomCount;
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

    const [data, total] = await Promise.all([
      this.prisma.realEstate.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: this.select }),
      this.prisma.realEstate.count({ where }),
    ]);

    if (data.length === 0 && (search || propertyType || dealType || sellerType || locationId || roomCount || minPrice !== undefined || maxPrice !== undefined)) {
      this.notificationService.recordEmptySearch(
        SearchType.REAL_ESTATE,
        { search, propertyType, dealType, sellerType, locationId, roomCount, minPrice, maxPrice },
        locationId,
        subscriberUserId,
      );
    }

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private listSelect = {
    id: true,
    title: true,
    price: true,
    propertyType: true,
    dealType: true,
    areaSize: true,
    roomCount: true,
    floor: true,
    viewCount: true,
    likeCount: true,
    status: true,
    locationId: true,
    createdAt: true,
    location: { select: { id: true, name: true, type: true, parent: { select: { id: true, name: true } } } },
    user: { select: { id: true, firstName: true, lastName: true } },
    media: { where: { isMain: true }, take: 1 },
  };

  async getById(id: number) {
    const re = await this.prisma.realEstate.findUnique({ where: { id }, select: this.select });
    if (!re) throw new NotFoundException("Ko'chmas mulk topilmadi");

    const similar = await this.prisma.realEstate.findMany({
      where: {
        id: { not: id },
        propertyType: (re as any).propertyType,
        dealType: (re as any).dealType,
        status: 'ACTIVE',
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: this.listSelect,
    });

    return { ...re, similar };
  }

  async create(userId: number, dto: CreateRealEstateDto) {
    const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundException('Joylashuv topilmadi');

    const realEstate = await this.prisma.realEstate.create({
      data: { ...dto, userId, status: RealEstateStatus.ACTIVE },
      select: this.select,
    });

    // Shu e'longa mos "topilmagan qidiruv"lar bo'lsa — egalariga bildirishnoma yuboriladi
    this.notificationService.matchAndNotify(SearchType.REAL_ESTATE, realEstate).catch(() => null);

    return realEstate;
  }

  async update(id: number, userId: number, isAdmin: boolean, dto: UpdateRealEstateDto) {
    const re = await this.getById(id);
    if (!isAdmin && (re as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
    return this.prisma.realEstate.update({ where: { id }, data: dto, select: this.select });
  }

  async changeStatus(id: number, userId: number, isAdmin: boolean, dto: ChangeRealEstateStatusDto) {
    const re = await this.getById(id);
    if (!isAdmin && (re as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
    return this.prisma.realEstate.update({ where: { id }, data: { status: dto.status }, select: this.select });
  }

  async delete(id: number, userId: number, isAdmin: boolean) {
    const re = await this.getById(id);
    if (!isAdmin && (re as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');

    // Media fayllarini o'chir
    const media = await this.prisma.propertyImgAndVideo.findMany({ where: { propertyId: id } });
    for (const m of media) {
      try {
        const filename = m.url.split('/').pop();
        const folder = m.mediaType === MediaType.VIDEO ? 'videos' : 'images';
        await unlink(join(process.cwd(), 'core', 'uploads', folder, filename!));
      } catch {}
    }

    await this.prisma.realEstate.delete({ where: { id } });
    return { message: 'Ko\'chmas mulk o\'chirildi' };
  }

  async addMedia(id: number, filename: string, isMain: boolean, mediaType: MediaType) {
    await this.getById(id);
    if (isMain) {
      await this.prisma.propertyImgAndVideo.updateMany({ where: { propertyId: id }, data: { isMain: false } });
    }
    return this.prisma.propertyImgAndVideo.create({
      data: { propertyId: id, url: `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`, isMain, mediaType },
    });
  }

  async deleteMedia(propertyId: number, mediaId: number) {
    const media = await this.prisma.propertyImgAndVideo.findFirst({ where: { id: mediaId, propertyId } });
    if (!media) throw new NotFoundException('Media topilmadi');
    try {
      const filename = media.url.split('/').pop();
      const folder = media.mediaType === MediaType.VIDEO ? 'videos' : 'images';
      await unlink(join(process.cwd(), 'core', 'uploads', folder, filename!));
    } catch {}
    await this.prisma.propertyImgAndVideo.delete({ where: { id: mediaId } });
    return { message: 'Media o\'chirildi' };
  }

  async toggleLike(id: number, userId: number) {
    await this.getById(id);

    const existing = await this.prisma.realEstate.findFirst({
      where: { id, likeCount: { gt: 0 } },
    });

    // Oddiy like/unlike — user-based yechim uchun alohida jadval qo'shish mumkin
    // Hozir likeCount ni ko'paytirish / kamaytirish
    const re = await this.prisma.realEstate.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true },
    });

    return { liked: true, likeCount: re.likeCount };
  }

  async recordView(id: number) {
    const re = await this.prisma.realEstate.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
    return { viewCount: re.viewCount };
  }
}
