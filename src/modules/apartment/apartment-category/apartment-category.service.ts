import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateApartmentCategoryDto } from './dto/create-apartment-category.dto';
import { UpdateApartmentCategoryDto } from './dto/update-apartment-category.dto';
import { UpdateApartmentCategoryStatusDto } from './dto/update-apartment-category-status.dto';

@Injectable()
export class ApartmentCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.apartmentCategory.findMany({
      include: {
        _count: {
          select: {
            apartments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const category = await this.prisma.apartmentCategory.findUnique({
      where: { id },
      include: {
        apartments: true,
        _count: {
          select: {
            apartments: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Apartment category topilmadi');
    }

    return category;
  }

  async create(dto: CreateApartmentCategoryDto) {
    return this.prisma.apartmentCategory.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateApartmentCategoryDto) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.update({
      where: { id },
      data: dto,
    });
  }

  async archive(id: number) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });
  }

  async unarchive(id: number) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });
  }

  async updateStatus(id: number, dto: UpdateApartmentCategoryStatusDto) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
    });
  }

  async toggleStatus(id: number) {
    const category = await this.getOne(id);
    return this.prisma.apartmentCategory.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.delete({
      where: { id },
    });
  }
}
