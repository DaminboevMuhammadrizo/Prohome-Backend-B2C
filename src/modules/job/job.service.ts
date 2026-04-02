import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.jobCategory.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const jobCategory = await this.prisma.jobCategory.findUnique({
      where: { id },
      include: {
        profiles: true,
      },
    });

    if (!jobCategory) {
      throw new NotFoundException('Job category topilmadi');
    }

    return jobCategory;
  }

  async create(dto: CreateJobDto) {
    return this.prisma.jobCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateJobDto) {
    await this.getOne(id);
    return this.prisma.jobCategory.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.jobCategory.delete({ where: { id } });
  }
}
