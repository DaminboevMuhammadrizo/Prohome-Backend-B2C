import { Injectable, NotFoundException } from '@nestjs/common';
import { ApartmentDealStatus } from '@prisma/client';
import { hashPassword } from 'src/common/config/bcrypt';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InteractionBufferService } from 'src/common/interactions/interaction-buffer.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { PhoneIdentityService } from 'src/common/services/phone-identity.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionBuffer: InteractionBufferService,
    private readonly phoneIdentityService: PhoneIdentityService,
  ) {}

  private async ensureRegion(regionId?: number): Promise<void> {
    if (!regionId) {
      return;
    }

    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw new NotFoundException('Region topilmadi');
    }
  }

  private async ensureUniquePhone(
    phone?: string,
    userId?: number,
  ): Promise<string | undefined> {
    if (!phone) {
      return undefined;
    }

    return this.phoneIdentityService.ensurePhoneAvailable({
      phone,
      excludeUserId: userId,
    });
  }

  private async findUserOrThrow(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user;
  }

  async getMe(user: AuthUser) {
    return this.getOne(user.id);
  }

  async getAll(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          region: true,
          masterProfile: {
            include: {
              categories: {
                include: {
                  jobCategory: true,
                },
              },
            },
          },
          _count: {
            select: {
              apartments: true,
              ratings: true,
              apartmentLikes: true,
              savedMasterProfiles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: data.map(({ password, ...safeUser }) => safeUser),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        region: true,
        masterProfile: {
          include: {
            categories: {
              include: {
                jobCategory: true,
              },
            },
            _count: {
              select: {
                ratings: true,
                savedBy: true,
                views: true,
                contacts: true,
              },
            },
          },
        },
        apartments: {
          include: {
            category: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        apartmentLikes: {
          include: {
            apartment: {
              include: {
                category: true,
              },
            },
          },
        },
        savedMasterProfiles: {
          include: {
            masterProfile: {
              include: {
                categories: {
                  include: {
                    jobCategory: true,
                  },
                },
              },
            },
          },
        },
        ratings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const soldApartmentCount = user.apartments.filter(
      (apartment) => apartment.dealStatus === ApartmentDealStatus.SOLD,
    ).length;

    const { password, ...safeUser } = user;

    return {
      ...safeUser,
      stats: {
        apartmentCount: user.apartments.length,
        soldApartmentCount,
        ratingCount: user.ratings.length,
        likedApartmentCount: user.apartmentLikes.length,
        savedMasterCount: user.savedMasterProfiles.length,
      },
    };
  }

  async updateMe(user: AuthUser, dto: UpdateUserMeDto) {
    await this.findUserOrThrow(user.id);
    await this.ensureRegion(dto.regionId);
    const phone = await this.ensureUniquePhone(dto.phone, user.id);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        regionId: dto.regionId,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
      include: { region: true },
    });

    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findUserOrThrow(id);
    await this.ensureRegion(dto.regionId);
    const phone = await this.ensureUniquePhone(dto.phone, id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        regionId: dto.regionId,
        role: dto.role,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
      include: { region: true },
    });

    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async setBlockStatus(id: number, isBlocked: boolean) {
    await this.findUserOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
      },
    });
  }

  async setArchiveStatus(id: number, isArchived: boolean) {
    await this.findUserOrThrow(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });
  }

  async getFavoriteApartments(user: AuthUser) {
    const pendingApartmentIds = this.interactionBuffer.getPendingApartmentLikeIdsForUser(
      user.id,
    );

    const apartmentLikes = await this.prisma.apartmentLike.findMany({
      where: { userId: user.id },
      include: {
        apartment: {
          include: {
            category: true,
            region: true,
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingApartments =
      pendingApartmentIds.length > 0
        ? await this.prisma.apartment.findMany({
            where: { id: { in: pendingApartmentIds } },
            include: {
              category: true,
              region: true,
              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          })
        : [];

    return {
      data: [
        ...apartmentLikes.map((item) => item.apartment),
        ...pendingApartments,
      ],
    };
  }

  async getSavedMasters(user: AuthUser) {
    const pendingMasterIds = this.interactionBuffer.getPendingMasterSaveIdsForUser(
      user.id,
    );

    const savedMasters = await this.prisma.masterProfileSave.findMany({
      where: { userId: user.id },
      include: {
        masterProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            categories: {
              include: {
                jobCategory: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingMasters =
      pendingMasterIds.length > 0
        ? await this.prisma.masterProfile.findMany({
            where: { id: { in: pendingMasterIds } },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              categories: {
                include: {
                  jobCategory: true,
                },
              },
            },
          })
        : [];

    return {
      data: [
        ...savedMasters.map((item) => item.masterProfile),
        ...pendingMasters,
      ],
    };
  }

  async delete(id: number) {
    await this.findUserOrThrow(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
