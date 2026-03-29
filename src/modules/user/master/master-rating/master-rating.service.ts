import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateMasterRatingDto } from './dto/create.master-rating.dto';
import { UpdateMasterRatingDto } from './dto/update.master-rating.dto';
import { PaginationDto } from '../../dto/pagination.dto';

@Injectable()
export class MasterRatingService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRating(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterRating.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } },
          masterProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.masterRating.count(),
    ]);

    return {
      data,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async getMyRatings(userId: number, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterRating.findMany({
        where: { userId },
        include: {
          masterProfile: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.masterRating.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async getOneRating(id: number) {
    const rating = await this.prisma.masterRating.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true } },
        masterProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!rating) throw new NotFoundException('Rating not found');
    return rating;
  }

  async getMyOneRating(id: number, userId: number) {
    const rating = await this.prisma.masterRating.findFirst({
      where: { id, userId },
      include: {
        masterProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!rating)
      throw new NotFoundException('Rating not found or it is not yours');
    return rating;
  }


  async getByMaster(masterProfileId: number, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterRating.findMany({
        where: { masterProfileId },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.masterRating.count({ where: { masterProfileId } }),
    ]);

    const stats = await this.prisma.masterRating.aggregate({
      where: { masterProfileId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      data,
      averageRating: stats._avg.rating?.toFixed(1) || 0,
      totalRatings: stats._count,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async create(userId: number, payload: CreateMasterRatingDto) {
    const { masterProfileId, rating, desc } = payload;
    const master = await this.prisma.masterProfile.findUnique({
      where: { id: masterProfileId },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    if (master.userId === userId) {
      throw new ForbiddenException(
        'you do not have permission to rate your own profile',
      );
    }

    return this.prisma.masterRating.create({
      data: {
        userId,
        masterProfileId,
        rating,
        desc,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async update(id: number, userId: number, payload: UpdateMasterRatingDto) {
    const ratingRecord = await this.prisma.masterRating.findUnique({
      where: { id },
    });

    if (!ratingRecord) throw new NotFoundException('Rating not found');

    if (ratingRecord.userId !== userId) {
      throw new ForbiddenException(
        'you do not have permission to update this rating',
      );
    }

    return this.prisma.masterRating.update({
      where: { id },
      data: {
        rating: payload.rating,
        desc: payload.desc,
      },
    });
  }


  async remove(id: number, userId: number) {
    const ratingRecord = await this.prisma.masterRating.findUnique({
      where: { id },
    });

    if (!ratingRecord) throw new NotFoundException('Rating not found');

    if (ratingRecord.userId !== userId) {
      throw new ForbiddenException('You are not the owner of this rating');
    }

    return this.prisma.masterRating.delete({
      where: { id },
    });
  }
}
