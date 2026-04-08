import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApartmentDealStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/database/prisma.service';
import { InteractionBufferService } from 'src/common/interactions/interaction-buffer.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertOwnership, isPrivilegedRole } from 'src/common/utils/access.util';
import { replaceImages, generateUrlsFromFiles } from 'src/common/utils/helper';
import { unlinkFile } from 'src/common/types/file.cotroller.typpes';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@Injectable()
export class ApartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interactionBuffer: InteractionBufferService,
    private readonly configService: ConfigService,
  ) {}

  private decorateApartment<
    T extends { id: number; likeCount: number }
  >(apartment: T) {
    return {
      ...apartment,
      likeCount:
        apartment.likeCount +
        this.interactionBuffer.getPendingApartmentLikeCount(apartment.id),
    };
  }

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
    const apartments = await this.prisma.apartment.findMany({
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

    return apartments.map((apartment) => this.decorateApartment(apartment));
  }

  async getSoldApartments() {
    const apartments = await this.prisma.apartment.findMany({
      where: {
        dealStatus: ApartmentDealStatus.SOLD,
      },
      include: {
        region: true,
        category: true,
        seller: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        complex: true,
        layout: true,
      },
      orderBy: { soldAt: 'desc' },
    });

    return apartments.map((apartment) => this.decorateApartment(apartment));
  }

  async getOne(id: number) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        region: true,
        category: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            isBlocked: true,
            isArchived: true,
          },
        },
        complex: true,
        layout: true,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment topilmadi');
    }

    return this.decorateApartment(apartment);
  }

  async getInteractionState(id: number, user: AuthUser) {
    await this.getOne(id);
    const existingLike = await this.prisma.apartmentLike.findUnique({
      where: {
        userId_apartmentId: {
          userId: user.id,
          apartmentId: id,
        },
      },
    });

    return {
      likedByMe:
        Boolean(existingLike) ||
        this.interactionBuffer.hasPendingApartmentLike(user.id, id),
    };
  }

  async addView(id: number, user?: AuthUser) {
    await this.getOne(id);
    await this.prisma.$transaction([
      this.prisma.apartmentView.create({
        data: {
          apartmentId: id,
          userId: user?.id,
        },
      }),
      this.prisma.apartment.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { message: 'Apartment view saqlandi' };
  }

  async create(
    user: AuthUser,
    dto: CreateApartmentDto,
    files: Express.Multer.File[],
  ) {
    await this.ensureRelations(dto);
    return this.prisma.apartment.create({
      data: {
        ...dto,
        images: generateUrlsFromFiles(files, this.configService),
        sellerId: user.id,
      },
      include: {
        region: true,
        category: true,
        seller: true,
      },
    });
  }

  async update(
    id: number,
    user: AuthUser,
    dto: UpdateApartmentDto,
    files: Express.Multer.File[],
  ) {
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
      data: {
        ...dto,
        images: replaceImages(files, apartment.images, this.configService),
      },
    });
  }

  async toggleLike(id: number, user: AuthUser) {
    await this.getOne(id);
    return this.interactionBuffer.toggleApartmentLike(user.id, id);
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
      data: {
        dealStatus: dto.dealStatus,
        soldAt:
          dto.dealStatus === ApartmentDealStatus.SOLD ? new Date() : null,
      },
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

    apartment.images.forEach((image) => unlinkFile(image));

    return this.prisma.apartment.delete({ where: { id } });
  }
}
