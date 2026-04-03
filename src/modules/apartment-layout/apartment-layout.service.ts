import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertCompanyAccess, isPrivilegedRole } from 'src/common/utils/access.util';
import { CreateApartmentLayoutDto } from './dto/create-apartment-layout.dto';
import { UpdateApartmentLayoutDto } from './dto/update-apartment-layout.dto';

@Injectable()
export class ApartmentLayoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCanManageComplex(complexId: number, user: AuthUser) {
    const complex = await this.prisma.complex.findUnique({
      where: { id: complexId },
      include: { company: true },
    });

    if (!complex) {
      throw new NotFoundException('Complex topilmadi');
    }

    if (!isPrivilegedRole(user.role)) {
      assertCompanyAccess(
        complex.company.ownerId,
        complex.company.id,
        user,
        'Siz bu complex layoutlarini boshqara olmaysiz',
      );
    }

    return complex;
  }

  async getAll() {
    return this.prisma.apartmentLayout.findMany({
      include: {
        complex: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const layout = await this.prisma.apartmentLayout.findUnique({
      where: { id },
      include: {
        complex: {
          include: {
            company: true,
          },
        },
        apartments: true,
      },
    });

    if (!layout) {
      throw new NotFoundException('Apartment layout topilmadi');
    }

    return layout;
  }

  async create(user: AuthUser, dto: CreateApartmentLayoutDto) {
    await this.assertCanManageComplex(dto.complexId, user);
    return this.prisma.apartmentLayout.create({ data: dto });
  }

  async update(id: number, user: AuthUser, dto: UpdateApartmentLayoutDto) {
    const layout = await this.prisma.apartmentLayout.findUnique({
      where: { id },
    });

    if (!layout) {
      throw new NotFoundException('Apartment layout topilmadi');
    }

    await this.assertCanManageComplex(layout.complexId, user);
    if (dto.complexId) {
      await this.assertCanManageComplex(dto.complexId, user);
    }

    return this.prisma.apartmentLayout.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number, user: AuthUser) {
    const layout = await this.prisma.apartmentLayout.findUnique({
      where: { id },
    });

    if (!layout) {
      throw new NotFoundException('Apartment layout topilmadi');
    }

    await this.assertCanManageComplex(layout.complexId, user);
    return this.prisma.apartmentLayout.delete({ where: { id } });
  }
}
