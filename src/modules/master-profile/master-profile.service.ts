import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthUser } from 'src/common/types/auth-user.type';
import { CreateMasterProfileDto } from './dto/create-master-profile.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';

@Injectable()
export class MasterProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCategory(categoryId?: number) {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.jobCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Job category topilmadi');
    }
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
          category: true,
          ratings: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterProfile.count(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        category: true,
        ratings: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    return profile;
  }

  async getMyProfile(user: AuthUser) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: user.id },
      include: {
        category: true,
        ratings: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Sizda master profile yo‘q');
    }

    return profile;
  }

  async create(user: AuthUser, dto: CreateMasterProfileDto) {
    const existingProfile = await this.prisma.masterProfile.findUnique({
      where: { userId: user.id },
    });

    if (existingProfile) {
      throw new ConflictException('Master profile allaqachon mavjud');
    }

    await this.ensureCategory(dto.categoryId);

    return this.prisma.masterProfile.create({
      data: {
        ...dto,
        userId: user.id,
      },
      include: {
        category: true,
      },
    });
  }

  async update(user: AuthUser, dto: UpdateMasterProfileDto) {
    await this.getMyProfile(user);
    await this.ensureCategory(dto.categoryId);

    return this.prisma.masterProfile.update({
      where: { userId: user.id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async delete(user: AuthUser) {
    await this.getMyProfile(user);
    return this.prisma.masterProfile.delete({
      where: { userId: user.id },
    });
  }
}
