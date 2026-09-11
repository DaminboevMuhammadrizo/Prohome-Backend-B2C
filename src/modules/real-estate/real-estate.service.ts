import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DealType, MediaType, PropertyType, RealEstateStatus, SearchType, SellerType } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/common/database/prisma.service';
import { RedisService } from 'src/common/config/redis/redis.service';
import { CACHE_TTL, cacheKey } from 'src/common/config/redis/cache.constants';
import { haversineKm } from 'src/common/utils/geo.util';
import { NotificationService } from 'src/modules/notification/notification.service';
import { ChangeRealEstateStatusDto, CreateRealEstateDto, UpdateRealEstateDto } from './dto/real-estate.dto';

const CACHE_NS = 're';

@Injectable()
export class RealEstateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly redis: RedisService,
  ) {}

  // Har qanday e'lon o'zgarishi (create/update/status/delete/media/like) ro'yxat
  // va detal cache'larini eskirtiradi — butun "re:*" namespace tozalanadi.
  private invalidateCache() {
    return this.redis.delByPattern(`${CACHE_NS}:*`).catch(() => null);
  }

  private select = {
    id: true,
    title: true,
    description: true,
    price: true,
    priceDesc: true,
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
    address: true,
    latitude: true,
    longitude: true,
    externalId: true,
    apiUrl: true,
    syncStatus: true,
    createdAt: true,
    updatedAt: true,
    location: { select: { id: true, name: true, type: true, parent: { select: { id: true, name: true } } } },
    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
    media: { orderBy: { isMain: 'desc' as const } },
  };

  // Ro'yxat (karta) uchun yengil select — og'ir maydonlar (description,
  // syncStatus, externalId/apiUrl, company logo, user obyekti, barcha media)
  // olib tashlangan. Faqat kartada ko'rsatiladigan + xarita uchun kerakli.
  private cardSelect = {
    id: true,
    title: true,
    price: true,
    priceDesc: true,
    address: true,
    contactPhone: true,
    propertyType: true,
    dealType: true,
    roomCount: true,
    areaSize: true,
    floor: true,
    status: true,
    viewCount: true,
    likeCount: true,
    latitude: true,
    longitude: true,
    createdAt: true,
    location: { select: { id: true, name: true } },
    media: { orderBy: { isMain: 'desc' as const }, select: { id: true, url: true, mediaType: true, isMain: true } },
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
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
    lat?: number;
    lng?: number;
  }) {
    const { page = 1, limit = 20, id, search, propertyType, dealType, sellerType, locationId, minPrice, maxPrice, roomCount, status, userId, subscriberUserId, createdFrom, createdTo, swLat, swLng, neLat, neLng, lat, lng } = params;
    const skip = (page - 1) * limit;

    // Foydalanuvchining joriy joylashuvi (ixtiyoriy) — berilsa, ro'yxat unga
    // eng yaqinidan boshlab qaytariladi. ~1.1km katakka yaxlitlanadi — kesh
    // samaradorligi uchun (aks holda har bir GPS koordinata alohida kesh
    // yozuvi yasab tashlaydi).
    const nearLat = lat !== undefined ? Math.round(lat * 100) / 100 : undefined;
    const nearLng = lng !== undefined ? Math.round(lng * 100) / 100 : undefined;

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
    // Xarita hududi (bounding box) bo'yicha qidirish — frontend xarita view'i ko'rsatib
    // turgan hudud chegaralarini (janubi-g'arbiy va shimoli-sharqiy burchak) yuboradi
    if (swLat !== undefined && swLng !== undefined && neLat !== undefined && neLng !== undefined) {
      where.latitude = { gte: swLat, lte: neLat };
      where.longitude = { gte: swLng, lte: neLng };
    }

    // Natija Redis'da cache qilinadi — kalit query parametrlaridan (subscriberUserId
    // dan TASHQARI, chunki u faqat quyidagi side-effect'ga ta'sir qiladi).
    const key = cacheKey(CACHE_NS, 'list', {
      page, limit, id, search, propertyType, dealType, sellerType, locationId,
      minPrice, maxPrice, roomCount, status, userId, createdFrom, createdTo,
      swLat, swLng, neLat, neLng, lat: nearLat, lng: nearLng,
    });
    const result = await this.redis.wrap(key, CACHE_TTL, async () => {
      const total = await this.prisma.realEstate.count({ where });

      let data: any[];
      if (nearLat !== undefined && nearLng !== undefined) {
        // Yaqinlik bo'yicha saralash oddiy Float ustunlarda DB darajasida arzon
        // hisoblanmaydi — mos yozuvlarni (cheklangan hajmda) olib, JS'da Haversine
        // masofa bo'yicha saralaymiz, keyin sahifalab qaymoqlaymiz. Koordinatasi
        // yo'q yozuvlar oxiriga tushadi.
        const origin = { latitude: nearLat, longitude: nearLng };
        const candidates = await this.prisma.realEstate.findMany({
          where, take: 500, orderBy: { createdAt: 'desc' }, select: this.cardSelect,
        });
        candidates.sort((a: any, b: any) => {
          const da = a.latitude != null && a.longitude != null ? haversineKm(origin, { latitude: a.latitude, longitude: a.longitude }) : Infinity;
          const db = b.latitude != null && b.longitude != null ? haversineKm(origin, { latitude: b.latitude, longitude: b.longitude }) : Infinity;
          return da - db;
        });
        data = candidates.slice(skip, skip + limit);
      } else {
        data = await this.prisma.realEstate.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: this.cardSelect });
      }

      return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    });

    // "Topilmagan qidiruv"ni yozish — cache'dan kelgan bo'lsa ham, natija bo'sh
    // bo'lsa har chaqiruvda tekshiriladi (o'zining ichki guard'lari bor).
    if (result.data.length === 0 && (search || propertyType || dealType || sellerType || locationId || roomCount || minPrice !== undefined || maxPrice !== undefined)) {
      this.notificationService.recordEmptySearch(
        SearchType.REAL_ESTATE,
        { search, propertyType, dealType, sellerType, locationId, roomCount, minPrice, maxPrice },
        locationId,
        subscriberUserId,
      );
    }

    return result;
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
    return this.redis.wrap(cacheKey(CACHE_NS, 'item', id), CACHE_TTL, async () => {
      const re = await this.prisma.realEstate.findUnique({ where: { id }, select: this.select });
      if (!re) throw new NotFoundException("Ko'chmas mulk topilmadi");

      // O'xshash e'lonlar — bir xil kategoriya (mulk turi + bitim turi) va
      // imkon qadar bir xil joylashuv (shahar) bo'yicha, 5 tagacha.
      let similar = await this.prisma.realEstate.findMany({
        where: {
          id: { not: id },
          propertyType: (re as any).propertyType,
          dealType: (re as any).dealType,
          locationId: (re as any).locationId,
          status: 'ACTIVE',
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: this.listSelect,
      });
      // Shu joylashuvda yetarli o'xshash topilmasa — joylashuvsiz kengroq qidiramiz
      if (similar.length < 5) {
        similar = await this.prisma.realEstate.findMany({
          where: { id: { not: id }, propertyType: (re as any).propertyType, dealType: (re as any).dealType, status: 'ACTIVE' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: this.listSelect,
        });
      }

      return { ...re, similar };
    });
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
    await this.invalidateCache();

    return realEstate;
  }

  async update(id: number, userId: number, isAdmin: boolean, dto: UpdateRealEstateDto) {
    const re = await this.getById(id);
    if (!isAdmin && (re as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
    const updated = await this.prisma.realEstate.update({ where: { id }, data: dto, select: this.select });
    await this.invalidateCache();
    return updated;
  }

  async changeStatus(id: number, userId: number, isAdmin: boolean, dto: ChangeRealEstateStatusDto) {
    const re = await this.getById(id);
    if (!isAdmin && (re as any).user.id !== userId) throw new ForbiddenException('Ruxsat yo\'q');
    const updated = await this.prisma.realEstate.update({ where: { id }, data: { status: dto.status }, select: this.select });
    await this.invalidateCache();
    return updated;
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
    await this.invalidateCache();
    return { message: 'Ko\'chmas mulk o\'chirildi' };
  }

  async addMedia(id: number, filename: string, isMain: boolean, mediaType: MediaType) {
    await this.getById(id);
    if (isMain) {
      await this.prisma.propertyImgAndVideo.updateMany({ where: { propertyId: id }, data: { isMain: false } });
    }
    const created = await this.prisma.propertyImgAndVideo.create({
      data: { propertyId: id, url: `${mediaType === MediaType.IMAGE ? 'image' : 'video'}/${filename}`, isMain, mediaType },
    });
    await this.invalidateCache();
    return created;
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
    await this.invalidateCache();
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
