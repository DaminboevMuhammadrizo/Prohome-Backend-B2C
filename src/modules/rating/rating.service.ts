import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthUser } from 'src/common/types/auth-user.type';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';

@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  private async recalculateMasterRating(masterProfileId: number) {
    const aggregate = await this.prisma.rating.aggregate({
      where: { masterProfileId },
      _avg: { score: true },
    });

    await this.prisma.masterProfile.update({
      where: { id: masterProfileId },
      data: { rating: aggregate._avg.score ?? 0 },
    });
  }

  async getAll(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          masterProfile: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const rating = await this.prisma.rating.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        masterProfile: true,
      },
    });

    if (!rating) {
      throw new NotFoundException('Rating topilmadi');
    }

    return rating;
  }

  async getMyRatings(user: AuthUser, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: { userId: user.id },
        include: { masterProfile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({ where: { userId: user.id } }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByMaster(masterProfileId: number, pagination: PaginationDto) {
    const masterProfile = await this.prisma.masterProfile.findUnique({
      where: { id: masterProfileId },
    });

    if (!masterProfile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: { masterProfileId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({ where: { masterProfileId } }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(user: AuthUser, dto: CreateRatingDto) {
    const masterProfile = await this.prisma.masterProfile.findUnique({
      where: { id: dto.masterProfileId },
    });

    if (!masterProfile) {
      throw new NotFoundException('Master profile topilmadi');
    }

    if (masterProfile.userId === user.id) {
      throw new ForbiddenException('O‘zingizga rating bera olmaysiz');
    }

    const existingRating = await this.prisma.rating.findUnique({
      where: {
        userId_masterProfileId: {
          userId: user.id,
          masterProfileId: dto.masterProfileId,
        },
      },
    });

    if (existingRating) {
      throw new ConflictException('Siz bu master uchun allaqachon rating qoldirgansiz');
    }

    const rating = await this.prisma.rating.create({
      data: {
        score: dto.score,
        comment: dto.comment,
        userId: user.id,
        masterProfileId: dto.masterProfileId,
      },
    });

    await this.recalculateMasterRating(dto.masterProfileId);
    return rating;
  }

  async update(id: number, user: AuthUser, dto: UpdateRatingDto) {
    const rating = await this.prisma.rating.findUnique({
      where: { id },
    });

    if (!rating) {
      throw new NotFoundException('Rating topilmadi');
    }

    if (rating.userId !== user.id) {
      throw new ForbiddenException('Siz faqat o‘zingizning ratingingizni yangilay olasiz');
    }

    const updatedRating = await this.prisma.rating.update({
      where: { id },
      data: {
        score: dto.score,
        comment: dto.comment,
      },
    });

    await this.recalculateMasterRating(rating.masterProfileId);
    return updatedRating;
  }

  async delete(id: number, user: AuthUser) {
    const rating = await this.prisma.rating.findUnique({
      where: { id },
    });

    if (!rating) {
      throw new NotFoundException('Rating topilmadi');
    }

    if (rating.userId !== user.id) {
      throw new ForbiddenException('Siz faqat o‘zingizning ratingingizni o‘chira olasiz');
    }

    const deletedRating = await this.prisma.rating.delete({
      where: { id },
    });

    await this.recalculateMasterRating(rating.masterProfileId);
    return deletedRating;
  }
}
