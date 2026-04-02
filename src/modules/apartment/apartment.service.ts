import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertOwnership, isPrivilegedRole } from 'src/common/utils/access.util';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@Injectable()
export class ApartmentService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureRelations(dto: {
    regionId?: number;
    categoryId?: number;
    complexId?: number;
    layoutId?: number;
  }) {
    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) {
        throw new NotFoundException('Region topilmadi');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.apartmentCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Apartment category topilmadi');
      }
    }

    if (dto.complexId) {
      const complex = await this.prisma.complex.findUnique({
        where: { id: dto.complexId },
      });
      if (!complex) {
        throw new NotFoundException('Complex topilmadi');
      }
    }

    if (dto.layoutId) {
      const layout = await this.prisma.apartmentLayout.findUnique({
        where: { id: dto.layoutId },
      });
      if (!layout) {
        throw new NotFoundException('Apartment layout topilmadi');
      }
    }
  }

  async getAll() {
    return this.prisma.apartment.findMany({
      include: {
        region: true,
        category: true,
        seller: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        complex: true,
        layout: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        region: true,
        category: true,
        seller: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        complex: true,
        layout: true,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment topilmadi');
    }

    return apartment;
  }

  async create(user: AuthUser, dto: CreateApartmentDto) {
    await this.ensureRelations(dto);
    return this.prisma.apartment.create({
      data: {
        ...dto,
        sellerId: user.id,
      },
      include: {
        region: true,
        category: true,
        seller: true,
      },
    });
  }

  async update(id: number, user: AuthUser, dto: UpdateApartmentDto) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment topilmadi');
    }

    if (!apartment.sellerId && !isPrivilegedRole(user.role)) {
      throw new ForbiddenException('Bu apartment egasi aniqlanmagan');
    }

    if (apartment.sellerId) {
      assertOwnership(
        apartment.sellerId,
        user,
        'Siz faqat o‘zingizning apartmentingizni yangilay olasiz',
      );
    }

    await this.ensureRelations(dto);

    return this.prisma.apartment.update({
      where: { id },
      data: dto,
    });
  }

  async updateStatus(id: number, user: AuthUser, dto: UpdateApartmentStatusDto) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment topilmadi');
    }

    if (apartment.sellerId) {
      assertOwnership(
        apartment.sellerId,
        user,
        'Siz faqat o‘zingizning apartmentingiz statusini o‘zgartira olasiz',
      );
    }

    return this.prisma.apartment.update({
      where: { id },
      data: { dealStatus: dto.dealStatus },
    });
  }

  async delete(id: number, user: AuthUser) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment topilmadi');
    }

    if (apartment.sellerId) {
      assertOwnership(
        apartment.sellerId,
        user,
        'Siz faqat o‘zingizning apartmentingizni o‘chira olasiz',
      );
    }

    return this.prisma.apartment.delete({ where: { id } });
  }
}
