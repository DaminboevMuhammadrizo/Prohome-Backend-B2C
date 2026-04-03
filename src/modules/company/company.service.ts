import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertCompanyAccess } from 'src/common/utils/access.util';
import { PhoneIdentityService } from 'src/common/services/phone-identity.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneIdentityService: PhoneIdentityService,
  ) {}

  private async ensureOwner(ownerId: number) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Company owner topilmadi');
    }

    return owner;
  }

  async getAll() {
    return this.prisma.company.findMany({
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        _count: {
          select: {
            complexes: true,
            views: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        complexes: {
          include: {
            apartments: {
              include: {
                category: true,
                seller: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            layouts: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            complexes: true,
            views: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company topilmadi');
    }

    const apartments = company.complexes.flatMap((complex) => complex.apartments);
    const analytics = {
      complexCount: company.complexes.length,
      apartmentCount: apartments.length,
      soldApartmentCount: apartments.filter(
        (apartment) => apartment.dealStatus === 'SOLD',
      ).length,
      totalApartmentLikeCount: apartments.reduce(
        (sum, apartment) => sum + apartment.likeCount,
        0,
      ),
      totalApartmentViewCount: apartments.reduce(
        (sum, apartment) => sum + apartment.viewCount,
        0,
      ),
      companyViewCount: company.viewCount,
    };

    return {
      ...company,
      analytics,
    };
  }

  async create(dto: CreateCompanyDto) {
    await this.ensureOwner(dto.ownerId);
    const phone = await this.phoneIdentityService.ensurePhoneAvailable({
      phone: dto.phone,
    });

    return this.prisma.company.create({
      data: {
        ...dto,
        phone,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
    });
  }

  async update(id: number, user: AuthUser, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company topilmadi');
    }

    assertCompanyAccess(
      company.ownerId,
      company.id,
      user,
      'Siz faqat o‘zingizning companyingizni yangilay olasiz',
    );

    if (dto.ownerId) {
      await this.ensureOwner(dto.ownerId);
    }

    const phone = dto.phone
      ? await this.phoneIdentityService.ensurePhoneAvailable({
          phone: dto.phone,
          excludeCompanyId: id,
        })
      : undefined;

    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        phone,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
    });
  }

  async setActiveStatus(id: number, isActive: boolean) {
    await this.getOne(id);
    return this.prisma.company.update({
      where: { id },
      data: { isActive },
    });
  }

  async addView(id: number, user?: AuthUser) {
    await this.prisma.$transaction([
      this.prisma.companyView.create({
        data: {
          companyId: id,
          userId: user?.id,
        },
      }),
      this.prisma.company.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return { message: 'Company view saqlandi' };
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.company.delete({ where: { id } });
  }
}
