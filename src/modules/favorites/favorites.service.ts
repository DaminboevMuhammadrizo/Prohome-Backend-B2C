import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(userId: number) {
    const [masters, jobs] = await Promise.all([
      this.prisma.masterLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          master: {
            select: {
              id: true,
              profileImg: true,
              experience: true,
              isFree: true,
              likeCount: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              skills: {
                take: 1,
                select: { skill: { select: { id: true, name: true, type: { select: { id: true, name: true } } } } },
              },
            },
          },
        },
      }),
      this.prisma.jobLike.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          job: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              contactPhone: true,
              status: true,
              likeCount: true,
              createdAt: true,
              skillType: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      masters: masters.map((m) => m.master),
      jobs: jobs.map((j) => j.job),
    };
  }
}
