import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateApartmentCategoryDto } from './dto/create-apartment-category.dto';
import { UpdateApartmentCategoryDto } from './dto/update-apartment-category.dto';

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

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.apartmentCategory.delete({
      where: { id },
    });
  }
}
