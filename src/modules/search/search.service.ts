import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(q: string) {
    if (!q || q.trim().length < 2) return { masters: [], realEstates: [], jobs: [], skills: [] };

    const search = q.trim();

    const [masters, realEstates, jobs, skills] = await Promise.all([
      this.prisma.master.findMany({
        where: {
          OR: [
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          id: true,
          profileImg: true,
          user: { select: { firstName: true, lastName: true } },
          skills: { take: 1, select: { skill: { select: { name: true } } } },
        },
      }),
      this.prisma.realEstate.findMany({
        where: { title: { contains: search, mode: 'insensitive' }, status: 'ACTIVE' },
        take: 5,
        select: { id: true, title: true, price: true, propertyType: true, dealType: true },
      }),
      this.prisma.job.findMany({
        where: { title: { contains: search, mode: 'insensitive' }, status: 'OPEN' },
        take: 5,
        select: { id: true, title: true, skillType: { select: { name: true } } },
      }),
      this.prisma.skills.findMany({
        where: { name: { contains: search, mode: 'insensitive' }, status: 'ACTIVE' },
        take: 5,
        select: { id: true, name: true, type: { select: { id: true, name: true } } },
      }),
    ]);

    return { masters, realEstates, jobs, skills };
  }
}
