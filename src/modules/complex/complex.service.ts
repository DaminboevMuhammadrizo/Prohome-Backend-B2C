import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertOwnership, isPrivilegedRole } from 'src/common/utils/access.util';
import { CreateComplexDto } from './dto/create-complex.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';

@Injectable()
export class ComplexService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureRelations(companyId?: number, regionId?: number) {
    if (companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        throw new NotFoundException('Company topilmadi');
      }
    }

    if (regionId) {
      const region = await this.prisma.region.findUnique({ where: { id: regionId } });
      if (!region) {
        throw new NotFoundException('Region topilmadi');
      }
    }
  }

  private async assertCanManage(companyId: number, user: AuthUser) {
    if (isPrivilegedRole(user.role)) {
      return;
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
      throw new NotFoundException('Company topilmadi');
    }

    assertOwnership(company.ownerId, user, 'Siz bu company complexlarini boshqara olmaysiz');
  }

  async getAll() {
    return this.prisma.complex.findMany({
      include: {
        company: true,
        region: true,
        layouts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(id: number) {
    const complex = await this.prisma.complex.findUnique({
      where: { id },
      include: {
        company: true,
        region: true,
        layouts: true,
        apartments: true,
      },
    });

    if (!complex) {
      throw new NotFoundException('Complex topilmadi');
    }

    return complex;
  }

  async create(user: AuthUser, dto: CreateComplexDto) {
    await this.ensureRelations(dto.companyId, dto.regionId);
    await this.assertCanManage(dto.companyId, user);
    return this.prisma.complex.create({ data: dto });
  }

  async update(id: number, user: AuthUser, dto: UpdateComplexDto) {
    const complex = await this.prisma.complex.findUnique({ where: { id } });

    if (!complex) {
      throw new NotFoundException('Complex topilmadi');
    }

    await this.assertCanManage(complex.companyId, user);
    await this.ensureRelations(dto.companyId, dto.regionId);

    if (dto.companyId) {
      await this.assertCanManage(dto.companyId, user);
    }

    return this.prisma.complex.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number, user: AuthUser) {
    const complex = await this.prisma.complex.findUnique({ where: { id } });

    if (!complex) {
      throw new NotFoundException('Complex topilmadi');
    }

    await this.assertCanManage(complex.companyId, user);
    return this.prisma.complex.delete({ where: { id } });
  }
}
