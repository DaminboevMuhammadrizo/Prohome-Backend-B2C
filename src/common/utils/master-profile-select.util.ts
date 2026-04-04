import { Prisma } from '@prisma/client';

type BuildMasterProfileSelectOptions = {
  includeUser?: boolean;
  includeUserPhone?: boolean;
  includeUserRegion?: boolean;
  includeUserStatus?: boolean;
  includeCategories?: boolean;
  includeRatings?: boolean;
  includeCounts?: boolean;
};

export function buildMasterProfileSelect(
  canUseSalaryType: boolean,
  options: BuildMasterProfileSelectOptions = {},
): Prisma.MasterProfileSelect {
  const userSelect: Prisma.UserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    ...(options.includeUserPhone ? { phone: true } : {}),
    ...(options.includeUserStatus
      ? {
          isBlocked: true,
          isArchived: true,
        }
      : {}),
    ...(options.includeUserRegion
      ? {
          region: {
            select: {
              id: true,
              nameUz: true,
              nameUzCyrl: true,
              nameRu: true,
            },
          },
        }
      : {}),
  };

  return {
    id: true,
    userId: true,
    bio: true,
    experience: true,
    skills: true,
    portfolios: true,
    isAvailable: true,
    salary: true,
    ...(canUseSalaryType ? { salaryType: true } : {}),
    rating: true,
    savedCount: true,
    viewCount: true,
    contactCount: true,
    createdAt: true,
    updatedAt: true,
    ...(options.includeUser
      ? {
          user: {
            select: userSelect,
          },
        }
      : {}),
    ...(options.includeCategories
      ? {
          categories: {
            include: {
              jobCategory: true,
            },
          },
        }
      : {}),
    ...(options.includeRatings
      ? {
          ratings: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        }
      : {}),
    ...(options.includeCounts
      ? {
          _count: {
            select: {
              ratings: true,
              savedBy: true,
              views: true,
              contacts: true,
            },
          },
        }
      : {}),
  };
}
