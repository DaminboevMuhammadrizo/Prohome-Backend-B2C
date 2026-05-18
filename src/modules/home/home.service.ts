import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [users, masters, realEstates, jobs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.master.count(),
      this.prisma.realEstate.count({ where: { status: 'ACTIVE' } }),
      this.prisma.job.count({ where: { status: 'OPEN' } }),
    ]);
    return { users, masters, realEstates, jobs };
  }

  async getCategories() {
    const [apartment, house, office, retail, masters] = await Promise.all([
      this.prisma.realEstate.count({ where: { propertyType: 'APARTMENT', status: 'ACTIVE' } }),
      this.prisma.realEstate.count({ where: { propertyType: 'HOUSE', status: 'ACTIVE' } }),
      this.prisma.realEstate.count({ where: { propertyType: 'OFFICE', status: 'ACTIVE' } }),
      this.prisma.realEstate.count({ where: { propertyType: 'RETAIL', status: 'ACTIVE' } }),
      this.prisma.master.count(),
    ]);
    return {
      realEstate: { apartment, house, office, retail },
      masters,
    };
  }
}
