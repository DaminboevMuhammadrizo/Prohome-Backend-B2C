import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InteractionBufferService } from 'src/common/interactions/interaction-buffer.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertAdmin } from 'src/common/utils/access.util';
import { CreateMasterProfileDto } from './dto/create-master-profile.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';

@Injectable()
export class MasterProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionBuffer: InteractionBufferService,
  ) {}

  private async ensureCategories(categoryIds?: number[]) {
    if (!categoryIds?.length) {
      return;
    }

    const categories = await this.prisma.jobCategory.findMany({
      where: {
        id: { in: categoryIds },
        isArchived: false,
      },
    });

    if (categories.length !== new Set(categoryIds).size) {
      throw new NotFoundException('Job categorylardan biri topilmadi');
    }
  }

  private decorateProfile<
    T extends { id: number; savedCount: number; viewCount: number }
  >(profile: T) {
    return {
      ...profile,
      savedCount: profile.savedCount + this.interactionBuffer.getPendingMasterSaveCount(profile.id),
      viewCount: profile.viewCount + this.interactionBuffer.getPendingMasterViewCount(profile.id),
    };
  }

  async getAll(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterProfile.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterProfile.count(),
    ]);

    return {
      data: data.map((profile) => this.decorateProfile(profile)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            isBlocked: true,
            isArchived: true,
          },
        },
        categories: {
          include: {
            jobCategory: true,
          },
        },
        ratings: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
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
    });

    if (!profile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    return this.decorateProfile(profile);
  }

  async getMyProfile(user: AuthUser) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: user.id },
      include: {
        categories: {
          include: {
            jobCategory: true,
          },
        },
        ratings: true,
        _count: {
          select: {
            ratings: true,
            savedBy: true,
            views: true,
            contacts: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Sizda master profile yo‘q');
    }

    return this.decorateProfile(profile);
  }

  async create(user: AuthUser, dto: CreateMasterProfileDto) {
    const existingProfile = await this.prisma.masterProfile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile) {
      throw new ConflictException('Master profile allaqachon mavjud');
    }

    await this.ensureCategories(dto.categoryIds);

    return this.prisma.masterProfile.create({
      data: {
        bio: dto.bio,
        experience: dto.experience,
        skills: dto.skills,
        portfolios: dto.portfolios,
        isAvailable: dto.isAvailable,
        salary: dto.salary,
        userId: user.id,
        categories: {
          create: dto.categoryIds.map((jobCategoryId) => ({
            jobCategoryId,
          })),
        },
      },
      include: {
        categories: {
          include: {
            jobCategory: true,
          },
        },
      },
    });
  }

  async update(user: AuthUser, dto: UpdateMasterProfileDto) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new NotFoundException('Sizda master profile yo‘q');
    }

    await this.ensureCategories(dto.categoryIds);

    return this.prisma.masterProfile.update({
      where: { userId: user.id },
      data: {
        bio: dto.bio,
        experience: dto.experience,
        skills: dto.skills,
        portfolios: dto.portfolios,
        isAvailable: dto.isAvailable,
        salary: dto.salary,
        categories: dto.categoryIds
          ? {
              deleteMany: {},
              create: dto.categoryIds.map((jobCategoryId) => ({
                jobCategoryId,
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            jobCategory: true,
          },
        },
      },
    });
  }

  async delete(user: AuthUser) {
    await this.getMyProfile(user);
    return this.prisma.masterProfile.delete({
      where: { userId: user.id },
    });
  }

  async toggleSave(id: number, user: AuthUser) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    if (profile.userId === user.id) {
      throw new ForbiddenException('O‘zingizni saqlay olmaysiz');
    }

    return this.interactionBuffer.toggleMasterSave(user.id, id);
  }

  async getInteractionState(id: number, user: AuthUser) {
    await this.getOne(id);
    const [saved, contacted] = await Promise.all([
      this.prisma.masterProfileSave.findUnique({
        where: {
          userId_masterProfileId: {
            userId: user.id,
            masterProfileId: id,
          },
        },
      }),
      this.prisma.masterProfileContact.findUnique({
        where: {
          userId_masterProfileId: {
            userId: user.id,
            masterProfileId: id,
          },
        },
      }),
    ]);

    return {
      savedByMe: Boolean(saved) || this.interactionBuffer.hasPendingMasterSave(user.id, id),
      contactedByMe: Boolean(contacted),
    };
  }

  async addView(id: number, user?: AuthUser) {
    await this.getOne(id);
    await this.interactionBuffer.addMasterView(user?.id ?? null, id);
    return { message: 'View qabul qilindi' };
  }

  async markContact(id: number, user: AuthUser) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    if (profile.userId === user.id) {
      throw new ForbiddenException('O‘zingiz bilan bog‘lanish yozuvini qoldira olmaysiz');
    }

    const existingContact = await this.prisma.masterProfileContact.findUnique({
      where: {
        userId_masterProfileId: {
          userId: user.id,
          masterProfileId: id,
        },
      },
    });

    if (existingContact) {
      return { message: 'Bog‘lanish avval yozilgan', contactRecorded: false };
    }

    await this.prisma.$transaction([
      this.prisma.masterProfileContact.create({
        data: {
          userId: user.id,
          masterProfileId: id,
        },
      }),
      this.prisma.masterProfile.update({
        where: { id },
        data: {
          contactCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { message: 'Bog‘lanish yozuvi saqlandi', contactRecorded: true };
  }

  async getViewers(id: number, user: AuthUser, pagination: PaginationDto) {
    assertAdmin(user);
    await this.getOne(id);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterProfileView.findMany({
        where: { masterProfileId: id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterProfileView.count({
        where: { masterProfileId: id },
      }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
