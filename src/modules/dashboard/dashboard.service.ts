import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private percentage(part: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Number(((part / total) * 100).toFixed(2));
  }

  async getSummary() {
    const [
      totalUsers,
      blockedUsers,
      archivedUsers,
      totalMasters,
      totalApartments,
      soldApartments,
      totalCompanies,
      activeCompanies,
      totalJobCategories,
      activeJobCategories,
      totalApartmentCategories,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.user.count({ where: { isArchived: true } }),
      this.prisma.masterProfile.count(),
      this.prisma.apartment.count(),
      this.prisma.apartment.count({ where: { dealStatus: 'SOLD' } }),
      this.prisma.company.count(),
      this.prisma.company.count({ where: { isActive: true } }),
      this.prisma.jobCategory.count(),
      this.prisma.jobCategory.count({ where: { isActive: true, isArchived: false } }),
      this.prisma.apartmentCategory.count(),
    ]);

    const [jobCategories, apartmentCategories] = await Promise.all([
      this.prisma.jobCategory.findMany({
        include: {
          _count: {
            select: {
              masterProfileCategories: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apartmentCategory.findMany({
        include: {
          _count: {
            select: {
              apartments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totals: {
        totalUsers,
        blockedUsers,
        archivedUsers,
        totalMasters,
        totalApartments,
        soldApartments,
        totalCompanies,
        activeCompanies,
        totalJobCategories,
        activeJobCategories,
        totalApartmentCategories,
      },
      percentages: {
        activeCompanyPercent: this.percentage(activeCompanies, totalCompanies),
        soldApartmentPercent: this.percentage(soldApartments, totalApartments),
        blockedUserPercent: this.percentage(blockedUsers, totalUsers),
        archivedUserPercent: this.percentage(archivedUsers, totalUsers),
        activeJobCategoryPercent: this.percentage(
          activeJobCategories,
          totalJobCategories,
        ),
      },
      jobCategoryBreakdown: jobCategories.map((category) => ({
        id: category.id,
        nameUz: category.nameUz,
        nameUzCyrl: category.nameUzCyrl,
        nameRu: category.nameRu,
        isActive: category.isActive,
        isArchived: category.isArchived,
        masterCount: category._count.masterProfileCategories,
        masterPercent: this.percentage(
          category._count.masterProfileCategories,
          totalMasters,
        ),
      })),
      apartmentCategoryBreakdown: apartmentCategories.map((category) => ({
        id: category.id,
        nameUz: category.nameUz,
        nameUzCyrl: category.nameUzCyrl,
        nameRu: category.nameRu,
        apartmentCount: category._count.apartments,
        apartmentPercent: this.percentage(
          category._count.apartments,
          totalApartments,
        ),
      })),
    };
  }
}
