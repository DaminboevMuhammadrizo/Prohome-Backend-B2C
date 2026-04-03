import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.jobCategory.findMany({
      include: {
        _count: {
          select: {
            masterProfileCategories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const jobCategory = await this.prisma.jobCategory.findUnique({
      where: { id },
      include: {
        masterProfileCategories: {
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
              },
            },
          },
        },
        _count: {
          select: {
            masterProfileCategories: true,
          },
        },
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

  async archive(id: number) {
    await this.getOne(id);
    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async unarchive(id: number) {
    await this.getOne(id);
    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  async updateStatus(id: number, dto: UpdateJobStatusDto) {
    await this.getOne(id);
    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
    });
  }

  async toggleStatus(id: number) {
    const category = await this.getOne(id);
    return this.prisma.jobCategory.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.jobCategory.delete({ where: { id } });
  }
}
