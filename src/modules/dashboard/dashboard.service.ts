import { Injectable } from '@nestjs/common';
import { DealType, JobStatus, PropertyType, RealEstateStatus, SellerType } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  private formatStat(num: number): string {
    if (num >= 1_000_000)
      return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M+';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K+';
    return `${num}+`;
  }

  async getHomeStats() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [users, realEstates, masters, jobs, newUsersWeek, newUsersMonth] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.realEstate.count({
          where: { status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.master.count(),
        this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
        this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      ]);

    return {
      users: this.formatStat(users),
      realEstates: this.formatStat(realEstates),
      masters: this.formatStat(masters),
      jobs: this.formatStat(jobs),
      newUsersThisWeek: newUsersWeek,
      newUsersThisMonth: newUsersMonth,
    };
  }

  async getHomeCategories() {
    const [apartment, house, office, rent, newBuilding, retail, masters, jobs] =
      await Promise.all([
        this.prisma.realEstate.count({
          where: { propertyType: PropertyType.APARTMENT, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.count({
          where: { propertyType: PropertyType.HOUSE, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.count({
          where: { propertyType: PropertyType.OFFICE, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.count({
          where: { dealType: DealType.RENT, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.count({
          where: {
            propertyType: PropertyType.APARTMENT,
            sellerType: SellerType.COMPANY,
            status: RealEstateStatus.ACTIVE,
          },
        }),
        this.prisma.realEstate.count({
          where: { propertyType: PropertyType.RETAIL, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.master.count(),
        this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      ]);

    return [
      { key: 'APARTMENT', name: 'Kvartira', description: "Ko'p qavatli uylar", count: apartment },
      { key: 'HOUSE', name: 'Hovli-uy', description: 'Yer bilan birga', count: house },
      { key: 'OFFICE', name: 'Ofis', description: 'Biznes uchun', count: office },
      { key: 'RENT', name: 'Ijara', description: 'Kunlik va uzoq muddat', count: rent },
      { key: 'NEW_BUILDING', name: 'Yangi bino', description: 'Yangi qurilgan', count: newBuilding },
      { key: 'RETAIL', name: 'Tijorat', description: 'Magazin, savdo', count: retail },
      { key: 'MASTER', name: 'Ustalar', description: 'Professional xizmat', count: masters },
      { key: 'JOB', name: 'Loyihalar', description: 'Yangi qurilishlar', count: jobs },
    ];
  }

  async getMastersStats() {
    const [total, freeMasters, ratingAgg] = await Promise.all([
      this.prisma.master.count(),
      this.prisma.master.count({ where: { isFree: true } }),
      this.prisma.rating.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      total: this.formatStat(total),
      freeMasters: this.formatStat(freeMasters),
      rating:
        typeof ratingAgg._avg.rating === 'number' ? ratingAgg._avg.rating.toFixed(1) + '★' : '0★',
      totalRatings: ratingAgg._count.rating,
      responseTime: '~24h'
    };
  }

  async getTopMasters(limit = 10) {
    const masters = await this.prisma.master.findMany({
      take: limit,
      orderBy: { likeCount: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        skills: {
          include: { skill: { include: { type: true } } },
          take: 3,
        },
        ratings: { select: { rating: true } },
      },
    });

    return masters.map((m) => ({
      id: m.id,
      profileImg: m.profileImg,
      experience: m.experience,
      bio: m.bio,
      salary: m.salary,
      isFree: m.isFree,
      likeCount: m.likeCount,
      viewCount: m.viewCount,
      user: m.user,
      skills: m.skills,
      avgRating:
        m.ratings.length > 0
          ? +(m.ratings.reduce((s, r) => s + r.rating, 0) / m.ratings.length).toFixed(1) : 0,
      ratingsCount: m.ratings.length,
    }));
  }

  async getRealEstateStats() {
    const [forSale, forRent, byType, totalViews, recentlyAdded] =
      await Promise.all([
        this.prisma.realEstate.count({
          where: { dealType: DealType.SALE, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.count({
          where: { dealType: DealType.RENT, status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.groupBy({
          by: ['propertyType'],
          _count: { propertyType: true },
          where: { status: RealEstateStatus.ACTIVE },
        }),
        this.prisma.realEstate.aggregate({ _sum: { viewCount: true } }),
        this.prisma.realEstate.findMany({
          where: { status: RealEstateStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 6,
          include: {
            media: { where: { isMain: true }, take: 1 },
            location: true,
          },
        }),
      ]);

    return {
      forSale,
      forRent,
      byType: byType.map((g) => ({
        type: g.propertyType,
        count: g._count.propertyType,
      })),
      totalViews: totalViews._sum.viewCount ?? 0,
      recentlyAdded,
    };
  }

  async getRecommendations() {
    const [realEstates, masters, jobs] = await Promise.all([
      this.prisma.realEstate.findMany({
        where: { status: RealEstateStatus.ACTIVE },
        orderBy: { viewCount: 'desc' },
        take: 8,
        include: {
          media: { where: { isMain: true }, take: 1 },
          location: true,
        },
      }),
      this.prisma.master.findMany({
        orderBy: { likeCount: 'desc' },
        take: 4,
        include: {
          user: { select: { firstName: true, lastName: true } },
          skills: { include: { skill: { include: { type: true } } }, take: 3 },
          ratings: { select: { rating: true } },
        },
      }),
      this.prisma.job.findMany({
        where: { status: JobStatus.OPEN },
        orderBy: { viewCount: 'desc' },
        take: 4,
        include: { location: true, skillType: true },
      }),
    ]);

    return {
      realEstates,
      masters: masters.map((m) => ({
        ...m,
        avgRating:
          m.ratings.length > 0
            ? +(
              m.ratings.reduce((s, r) => s + r.rating, 0) / m.ratings.length
            ).toFixed(1)
            : 0,
      })),
      jobs,
    };
  }

  async getSearchSuggestions(query: string) {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();

    const [estates, jobs] = await Promise.all([
      this.prisma.realEstate.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          status: RealEstateStatus.ACTIVE,
        },
        select: { title: true },
        take: 4,
      }),
      this.prisma.job.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          status: JobStatus.OPEN,
        },
        select: { title: true },
        take: 3,
      }),
    ]);

    const suggestions = [
      ...estates.map((e) => ({ text: e.title, type: 'real-estate' })),
      ...jobs.map((j) => ({ text: j.title, type: 'job' })),
    ];

    return Array.from(
      new Map(suggestions.map((s) => [s.text, s])).values(),
    ).slice(0, 7);
  }

  async getFavorites(userId: number) {
    const [likedJobs, likedMasters] = await Promise.all([
      this.prisma.jobLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: { location: true, skillType: true },
          },
        },
      }),
      this.prisma.masterLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          master: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              skills: { include: { skill: true }, take: 3 },
              ratings: { select: { rating: true } },
            },
          },
        },
      }),
    ]);

    return {
      jobs: likedJobs.map((l) => ({ ...l.job, likedAt: l.createdAt })),
      masters: likedMasters.map((l) => ({
        ...l.master,
        avgRating:
          l.master.ratings.length > 0
            ? +(
              l.master.ratings.reduce((s, r) => s + r.rating, 0) /
              l.master.ratings.length
            ).toFixed(1)
            : 0,
        likedAt: l.createdAt,
      })),
    };
  }

  async fetchExchangeRates(): Promise<{
    USD: number | null;
    EUR: number | null;
    RUB: number | null;
    updatedAt: string;
  }> {
    try {
      const { data } = await axios.get<any[]>(
        'https://cbu.uz/uz/arkhiv-kursov-valyut/json/',
        {
          timeout: 15000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        },
      );

      const findRate = (code: string): number | null => {
        const item = data.find((r) => r.Ccy === code);
        if (!item) return null;
        return Number(item.Rate);
      };

      return {
        USD: findRate('USD'),
        EUR: findRate('EUR'),
        RUB: findRate('RUB'),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Valyuta kurslarini olishda xatolik');

      return {
        USD: null,
        EUR: null,
        RUB: null,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async getPlatformOverview() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalUsers,
      newUsersMonth,
      newUsersWeek,
      totalRealEstates,
      activeRealEstates,
      soldRealEstates,
      totalMasters,
      freeMasters,
      totalJobs,
      openJobs,
      completedJobs,
      totalRatings,
      avgRating,
      totalLikesJob,
      totalLikesMaster,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.realEstate.count(),
      this.prisma.realEstate.count({
        where: { status: RealEstateStatus.ACTIVE },
      }),
      this.prisma.realEstate.count({
        where: { status: RealEstateStatus.SOLD },
      }),
      this.prisma.master.count(),
      this.prisma.master.count({ where: { isFree: true } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.OPEN } }),
      this.prisma.job.count({ where: { status: JobStatus.COMPLETED } }),
      this.prisma.rating.count(),
      this.prisma.rating.aggregate({ _avg: { rating: true } }),
      this.prisma.jobLike.count(),
      this.prisma.masterLike.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersMonth,
        newThisWeek: newUsersWeek,
      },
      realEstates: {
        total: totalRealEstates,
        active: activeRealEstates,
        sold: soldRealEstates,
        archived: totalRealEstates - activeRealEstates - soldRealEstates,
      },
      masters: {
        total: totalMasters,
        free: freeMasters,
        busy: totalMasters - freeMasters,
      },
      jobs: {
        total: totalJobs,
        open: openJobs,
        completed: completedJobs,
        other: totalJobs - openJobs - completedJobs,
      },
      engagement: {
        totalRatings,
        avgRating: avgRating._avg.rating
          ? +avgRating._avg.rating.toFixed(1)
          : 0,
        jobLikes: totalLikesJob,
        masterLikes: totalLikesMaster,
      },
    };
  }

  async getTopLocations(limit = 10) {
    const grouped = await this.prisma.realEstate.groupBy({
      by: ['locationId'],
      _count: { locationId: true },
      where: { status: RealEstateStatus.ACTIVE },
      orderBy: { _count: { locationId: 'desc' } },
      take: limit,
    });

    const ids = grouped.map((g) => g.locationId);
    const locations = await this.prisma.location.findMany({
      where: { id: { in: ids } },
    });

    return grouped.map((g) => ({
      location: locations.find((l) => l.id === g.locationId) ?? null,
      listingsCount: g._count.locationId,
    }));
  }

  // ─── DRAFTS (stub – no Draft model in schema) ─────────────────────────

  async getDrafts(_userId: number) {
    return [];
  }

  async createDraft(_userId: number, _dto: any) {
    return { success: true };
  }

  async deleteDraft(_userId: number, _draftId: number) {
    return { success: true };
  }
}
