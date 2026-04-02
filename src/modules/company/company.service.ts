import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { assertOwnership } from 'src/common/utils/access.util';
import { AuthUser } from 'src/common/types/auth-user.type';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePhone(phone: string): string {
    return phone.startsWith('+') ? phone : `+${phone}`;
  }

  async getAll() {
    return this.prisma.company.findMany({
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, phone: true },
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
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        complexes: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company topilmadi');
    }

    return company;
  }

  async create(dto: CreateCompanyDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Company owner topilmadi');
    }

    const phone = this.normalizePhone(dto.phone);
    const existingCompany = await this.prisma.company.findUnique({
      where: { phone },
    });

    if (existingCompany) {
      throw new ConflictException('Bu telefon raqamli company mavjud');
    }

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

    assertOwnership(company.ownerId, user, 'Siz faqat o‘zingizning companyingizni yangilay olasiz');

    if (dto.ownerId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: dto.ownerId },
      });

      if (!owner) {
        throw new NotFoundException('Yangi owner topilmadi');
      }
    }

    const phone = dto.phone ? this.normalizePhone(dto.phone) : undefined;
    if (phone) {
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          phone,
          NOT: { id },
        },
      });

      if (existingCompany) {
        throw new ConflictException('Bu telefon raqamli company mavjud');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        phone,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
    });
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.company.delete({ where: { id } });
  }
}
