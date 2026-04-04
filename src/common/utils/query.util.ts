import { Prisma } from '@prisma/client';

export function buildDateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    gte: from ? new Date(from) : undefined,
    lte: to ? new Date(to) : undefined,
  };
}

export function normalizeSearch(search?: string): string | undefined {
  const normalized = search?.trim();
  return normalized ? normalized : undefined;
}
