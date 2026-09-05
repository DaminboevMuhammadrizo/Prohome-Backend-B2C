import { Injectable } from '@nestjs/common';
import { JobStatus, LocationType, NotificationStatus, RealEstateStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';

type LocationRow = { id: number; name: string; type: LocationType; parentId: number | null };
type Resolved = { country: string | null; region: string | null; city: string | null };

const TREND_DAYS = 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Umumiy joylashuv hal qiluvchi ─────────────────────────
  // Barcha location'larni bir marta xotiraga yuklab, har bir id uchun davlat/viloyat/shahar
  // zanjirini aniqlaydi — har bir jadval uchun alohida DB so'rov yubormaslik uchun.

  private async buildLocationResolver(): Promise<(locationId: number | null | undefined) => Resolved> {
    const locations = await this.prisma.location.findMany();
    const map = new Map<number, LocationRow>(locations.map((l) => [l.id, l]));

    return (locationId) => {
      if (!locationId) return { country: null, region: null, city: null };
      let current = map.get(locationId);
      let country: string | null = null;
      let region: string | null = null;
      let city: string | null = null;
      let depth = 0;

      while (current && depth < 5) {
        if (current.type === LocationType.COUNTRY) country = current.name;
        if (current.type === LocationType.REGION) region = current.name;
        if (current.type === LocationType.CITY) city = current.name;
        current = current.parentId ? map.get(current.parentId) : undefined;
        depth++;
      }

      return { country, region, city };
    };
  }

  // Ikki bosqichli: avval faqat davlatlar (soni bilan), har bir davlat ichida esa
  // o'sha davlatga tegishli viloyatlar ichma-ich (nested) turadi — front-end davlatni
  // bosganda shu `regions` massivini ochib ko'rsatishi mumkin (har qanday davlat uchun,
  // faqat O'zbekiston uchun emas).
  private geoBreakdown(groups: { locationId: number | null; count: number }[], resolve: (id: number | null) => Resolved) {
    const countryTotals = new Map<string, number>();
    const regionsByCountry = new Map<string, Map<string, number>>();
    let unknown = 0;

    for (const g of groups) {
      const { country, region } = resolve(g.locationId);
      if (!country) {
        unknown += g.count;
        continue;
      }
      countryTotals.set(country, (countryTotals.get(country) ?? 0) + g.count);
      if (region) {
        if (!regionsByCountry.has(country)) regionsByCountry.set(country, new Map());
        const regionMap = regionsByCountry.get(country)!;
        regionMap.set(region, (regionMap.get(region) ?? 0) + g.count);
      }
    }

    const byCountry = Array.from(countryTotals.entries())
      .map(([name, count]) => ({
        name,
        count,
        regions: Array.from(regionsByCountry.get(name)?.entries() ?? [])
          .map(([regionName, regionCount]) => ({ name: regionName, count: regionCount }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);

    return { byCountry, unknown };
  }

  // Berilgan Prisma modeli bo'yicha oxirgi 30 kunlik kunlik trend (createdAt asosida)
  private async dailyTrend(model: 'user' | 'realEstate' | 'job' | 'searchSubscription' | 'master', days = TREND_DAYS) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows: { createdAt: Date }[] = await (this.prisma[model] as any).findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows) {
      const day = r.createdAt.toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    const result: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      result.push({ date: day, count: counts.get(day) ?? 0 });
    }
    return result;
  }

  // ───────────────────────── 1) Umumiy ko'rinish ─────────────────────────

  async getOverview() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsersWeek, newUsersMonth,
      totalMasters, totalRealEstates, activeRealEstates,
      totalJobs, openJobs, totalCompanies,
      totalSearchMisses, unresolvedSearchMisses,
      totalNotifications, sentNotifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.master.count(),
      this.prisma.realEstate.count(),
      this.prisma.realEstate.count({ where: { status: RealEstateStatus.ACTIVE } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      this.prisma.company.count(),
      this.prisma.searchSubscription.count(),
      this.prisma.searchSubscription.count({ where: { notifiedAt: null } }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { status: NotificationStatus.SENT } }),
    ]);

    return {
      users: { total: totalUsers, newThisWeek: newUsersWeek, newThisMonth: newUsersMonth },
      masters: { total: totalMasters },
      realEstates: { total: totalRealEstates, active: activeRealEstates },
      jobs: { total: totalJobs, open: openJobs },
      companies: { total: totalCompanies },
      searchMisses: { total: totalSearchMisses, unresolved: unresolvedSearchMisses, matched: totalSearchMisses - unresolvedSearchMisses },
      notifications: { total: totalNotifications, sent: sentNotifications },
    };
  }

  // ───────────────────────── 2) Foydalanuvchilar ─────────────────────────

  async getUsersAnalytics() {
    const resolve = await this.buildLocationResolver();

    const [locGroups, roleGroups, statusGroups, trend] = await Promise.all([
      this.prisma.user.groupBy({ by: ['locationId'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.dailyTrend('user'),
    ]);

    const geography = this.geoBreakdown(
      locGroups.map((g) => ({ locationId: g.locationId, count: g._count._all })),
      resolve,
    );

    const byRole = Object.fromEntries(Object.values(UserRole).map((r) => [r, 0])) as Record<UserRole, number>;
    roleGroups.forEach((g) => (byRole[g.role] = g._count._all));

    const byStatus = Object.fromEntries(Object.values(UserStatus).map((s) => [s, 0])) as Record<UserStatus, number>;
    statusGroups.forEach((g) => (byStatus[g.status] = g._count._all));

    return { total: roleGroups.reduce((s, g) => s + g._count._all, 0), byRole, byStatus, geography, registrationTrend: trend };
  }

  // ───────────────────────── 3) Ustalar ─────────────────────────

  async getMastersAnalytics() {
    const resolve = await this.buildLocationResolver();

    const [masters, freeCount, ratingAgg, skillLinks] = await Promise.all([
      this.prisma.master.findMany({ select: { id: true, isFree: true, user: { select: { locationId: true } } } }),
      this.prisma.master.count({ where: { isFree: true } }),
      this.prisma.rating.aggregate({ _avg: { rating: true }, _count: { rating: true }, where: { masterId: { not: null } } }),
      this.prisma.masterSkills.findMany({ select: { skillId: true, skill: { select: { type: { select: { name: true } } } } } }),
    ]);

    const locGroups = new Map<number | null, number>();
    for (const m of masters) {
      const key = m.user?.locationId ?? null;
      locGroups.set(key, (locGroups.get(key) ?? 0) + 1);
    }
    const geography = this.geoBreakdown(
      Array.from(locGroups.entries()).map(([locationId, count]) => ({ locationId, count })),
      resolve,
    );

    const bySkillType = new Map<string, number>();
    for (const link of skillLinks) {
      const name = link.skill?.type?.name ?? "Noma'lum";
      bySkillType.set(name, (bySkillType.get(name) ?? 0) + 1);
    }

    return {
      total: masters.length,
      free: freeCount,
      busy: masters.length - freeCount,
      avgRating: ratingAgg._avg.rating ? +ratingAgg._avg.rating.toFixed(1) : 0,
      totalRatings: ratingAgg._count.rating,
      geography,
      bySkillType: Array.from(bySkillType.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }

  // ───────────────────────── 4) Ko'chmas mulklar ─────────────────────────

  async getRealEstatesAnalytics() {
    const resolve = await this.buildLocationResolver();

    const [locGroups, propertyTypeGroups, dealTypeGroups, statusGroups, priceByDeal, viewsAgg, trend] = await Promise.all([
      this.prisma.realEstate.groupBy({ by: ['locationId'], _count: { _all: true } }),
      this.prisma.realEstate.groupBy({ by: ['propertyType'], _count: { _all: true } }),
      this.prisma.realEstate.groupBy({ by: ['dealType'], _count: { _all: true } }),
      this.prisma.realEstate.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.realEstate.groupBy({ by: ['dealType'], _avg: { price: true }, _min: { price: true }, _max: { price: true } }),
      this.prisma.realEstate.aggregate({ _sum: { viewCount: true }, _avg: { viewCount: true } }),
      this.dailyTrend('realEstate'),
    ]);

    const geography = this.geoBreakdown(
      locGroups.map((g) => ({ locationId: g.locationId, count: g._count._all })),
      resolve,
    );

    return {
      total: locGroups.reduce((s, g) => s + g._count._all, 0),
      byPropertyType: propertyTypeGroups.map((g) => ({ type: g.propertyType, count: g._count._all })),
      byDealType: dealTypeGroups.map((g) => ({ type: g.dealType, count: g._count._all })),
      byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      priceStats: priceByDeal.map((g) => ({
        dealType: g.dealType,
        avg: g._avg.price ? Math.round(Number(g._avg.price)) : 0,
        min: g._min.price ? Number(g._min.price) : 0,
        max: g._max.price ? Number(g._max.price) : 0,
      })),
      totalViews: viewsAgg._sum.viewCount ?? 0,
      avgViews: viewsAgg._avg.viewCount ? +viewsAgg._avg.viewCount.toFixed(1) : 0,
      geography,
      listingTrend: trend,
    };
  }

  // ───────────────────────── 5) Ish e'lonlari ─────────────────────────

  async getJobsAnalytics() {
    const resolve = await this.buildLocationResolver();

    const [locGroups, skillTypeGroups, statusGroups, viewsAgg, trend] = await Promise.all([
      this.prisma.job.groupBy({ by: ['locationId'], _count: { _all: true } }),
      this.prisma.job.groupBy({ by: ['skillTypeId'], _count: { _all: true } }),
      this.prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.job.aggregate({ _sum: { viewCount: true }, _avg: { viewCount: true } }),
      this.dailyTrend('job'),
    ]);

    const geography = this.geoBreakdown(
      locGroups.map((g) => ({ locationId: g.locationId, count: g._count._all })),
      resolve,
    );

    const skillTypes = await this.prisma.skillType.findMany({ where: { id: { in: skillTypeGroups.map((g) => g.skillTypeId) } } });
    const bySkillType = skillTypeGroups
      .map((g) => ({ name: skillTypes.find((s) => s.id === g.skillTypeId)?.name ?? "Noma'lum", count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      total: locGroups.reduce((s, g) => s + g._count._all, 0),
      byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      bySkillType,
      totalViews: viewsAgg._sum.viewCount ?? 0,
      avgViews: viewsAgg._avg.viewCount ? +viewsAgg._avg.viewCount.toFixed(1) : 0,
      geography,
      listingTrend: trend,
    };
  }

  // ───────────────────────── 6) Topilmagan qidiruvlar ─────────────────────────

  async getSearchMissesAnalytics() {
    const resolve = await this.buildLocationResolver();

    const [typeGroups, locGroups, total, notified, trend, all] = await Promise.all([
      this.prisma.searchSubscription.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.searchSubscription.groupBy({ by: ['locationId'], _count: { _all: true } }),
      this.prisma.searchSubscription.count(),
      this.prisma.searchSubscription.count({ where: { notifiedAt: { not: null } } }),
      this.dailyTrend('searchSubscription'),
      this.prisma.searchSubscription.findMany({ select: { type: true, criteria: true } }),
    ]);

    const geography = this.geoBreakdown(
      locGroups.map((g) => ({ locationId: g.locationId, count: g._count._all })),
      resolve,
    );

    // Har bir turdagi qidiruvda eng ko'p uchragan kriteriya qiymatlarini chiqarish
    // (masalan REAL_ESTATE uchun eng ko'p qidirilgan propertyType/dealType)
    const topCriteriaByType: Record<string, { field: string; value: string; count: number }[]> = {};
    for (const type of ['REAL_ESTATE', 'JOB', 'MASTER']) {
      const items = all.filter((s) => s.type === type);
      const counter = new Map<string, number>();
      for (const item of items) {
        const criteria = item.criteria as Record<string, any>;
        for (const [field, value] of Object.entries(criteria)) {
          if (value === undefined || value === null || field === 'locationId' || field === 'search') continue;
          const key = `${field}=${value}`;
          counter.set(key, (counter.get(key) ?? 0) + 1);
        }
      }
      topCriteriaByType[type] = Array.from(counter.entries())
        .map(([key, count]) => {
          const [field, value] = key.split('=');
          return { field, value, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    return {
      total,
      notified,
      unresolved: total - notified,
      byType: typeGroups.map((g) => ({ type: g.type, count: g._count._all })),
      geography,
      trend,
      topCriteriaByType,
    };
  }

  // ───────────────────────── 7) Bildirishnomalar ─────────────────────────

  async getNotificationsAnalytics() {
    const [statusGroups, categoryGroups, total, unread] = await Promise.all([
      this.prisma.notification.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.notification.groupBy({ by: ['category'], _count: { _all: true } }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      total,
      unread,
      byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      byCategory: categoryGroups.map((g) => ({ category: g.category, count: g._count._all })),
      deliveryRate: total > 0 ? +(((statusGroups.find((s) => s.status === 'SENT')?._count._all ?? 0) / total) * 100).toFixed(1) : 0,
    };
  }
}
