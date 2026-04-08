import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertCompanyAccess, isPrivilegedRole } from 'src/common/utils/access.util';
import { unlinkFile } from 'src/common/types/file.cotroller.typpes';
import { generateUrlsFromFiles, replaceImages } from 'src/common/utils/helper';
import { CreateApartmentLayoutDto } from './dto/create-apartment-layout.dto';
import { UpdateApartmentLayoutDto } from './dto/update-apartment-layout.dto';

@Injectable()
export class ApartmentLayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

  async create(
    user: AuthUser,
    dto: CreateApartmentLayoutDto,
    images?: Express.Multer.File[],
  ) {
    if (!images?.length) {
      throw new BadRequestException('Apartment layout uchun kamida bitta rasm majburiy');
    }

    await this.assertCanManageComplex(dto.complexId, user);
    return this.prisma.apartmentLayout.create({
      data: {
        ...dto,
        images: generateUrlsFromFiles(images, this.config),
      },
    });
  }

  async update(
    id: number,
    user: AuthUser,
    dto: UpdateApartmentLayoutDto,
    images?: Express.Multer.File[],
  ) {
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
      data: {
        ...dto,
        images: replaceImages(images, layout.images, this.config),
      },
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
    layout.images.forEach((image) => unlinkFile(image));
    return this.prisma.apartmentLayout.delete({ where: { id } });
  }
}
