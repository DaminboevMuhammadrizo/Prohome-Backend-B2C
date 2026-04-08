import { ApartmentDealStatus, Prisma } from '@prisma/client';
import { buildDateRange, normalizeSearch } from 'src/common/utils/query.util';
import { ApartmentQueryDto } from '../dto/apartment-query.dto';

export function buildApartmentWhere(
  query: ApartmentQueryDto,
  overrides: {
    complexId?: number;
    isCottage?: boolean;
    dealStatus?: ApartmentDealStatus;
  } = {},
): Prisma.ApartmentWhereInput {
  const search = normalizeSearch(query.search);

  return {
    regionId: query.regionId,
    categoryId: query.categoryId,
    complexId: overrides.complexId ?? query.complexId,
    layoutId: query.layoutId,
    sellerId: query.sellerId,
    listingType: query.listingType,
    dealStatus: overrides.dealStatus ?? query.dealStatus,
    isCottage: overrides.isCottage ?? query.isCottage,
    roomCount: {
      gte: query.roomCountMin,
      lte: query.roomCountMax,
    },
    area: {
      gte: query.areaMin,
      lte: query.areaMax,
    },
    price: {
      gte: query.priceMin,
      lte: query.priceMax,
    },
    floor: {
      gte: query.floorMin,
      lte: query.floorMax,
    },
    createdAt: buildDateRange(query.createdFrom, query.createdTo),
    OR: search
      ? [
          { titleUz: { contains: search, mode: 'insensitive' } },
          { titleUzCyrl: { contains: search, mode: 'insensitive' } },
          { titleRu: { contains: search, mode: 'insensitive' } },
          { descriptionUz: { contains: search, mode: 'insensitive' } },
          { descriptionUzCyrl: { contains: search, mode: 'insensitive' } },
          { descriptionRu: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ]
      : undefined,
  };
}
