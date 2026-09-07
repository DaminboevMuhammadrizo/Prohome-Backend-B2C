import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { B2bService } from '../b2b/b2b.service';
import { ContentLimitDto, CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly b2bService: B2bService,
  ) {}

  // ── B2B company list (admin panelda ko'rsatish uchun) ────────────────────

  async getB2bCompanies() {
    const [b2bList, b2cList] = await Promise.all([
      this.b2bService.getCompanies(),
      this.prisma.company.findMany({ select: { b2bCompanyId: true } }),
    ]);

    const addedIds = new Set(b2cList.map((c) => c.b2bCompanyId));

    return (b2bList as any[]).map((c) => ({
      ...c,
      addedToB2c: addedIds.has(c.id),
    }));
  }

  // ── B2C company CRUD (admin) ─────────────────────────────────────────────

  async getAll(params: {
    page?: number; limit?: number; id?: number; search?: string; isActive?: boolean; createdFrom?: string; createdTo?: string;
  } = {}) {
    const { page = 1, limit = 20, id, search, isActive, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (id !== undefined) where.id = id;
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
    if (isActive !== undefined) where.isActive = isActive;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, logo: true, isActive: true, b2bCompanyId: true, createdAt: true },
      }),
      this.prisma.company.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(dto: CreateCompanyDto) {
    const exists = await this.prisma.company.findFirst({
      where: { OR: [{ phone: dto.phone }, { b2bCompanyId: dto.b2bCompanyId }] },
    });
    if (exists) throw new BadRequestException('Bu kompaniya yoki telefon raqam allaqachon qo\'shilgan');

    // Global default limitlarni ol — agar dto da berilmasa, shulardan foydalan
    const globalConfig = await this.prisma.contentLimitConfig.findUnique({ where: { id: 1 } });
    const newsWeeklyLimit = dto.newsWeeklyLimit ?? globalConfig?.newsWeeklyLimit ?? 2;
    const reelsWeeklyLimit = dto.reelsWeeklyLimit ?? globalConfig?.reelsWeeklyLimit ?? 2;

    return this.prisma.company.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        logo: dto.logo,
        b2bCompanyId: dto.b2bCompanyId,
        password: await hashPassword(dto.password),
        newsWeeklyLimit,
        reelsWeeklyLimit,
      },
      select: { id: true, name: true, phone: true, logo: true, isActive: true, b2bCompanyId: true, newsWeeklyLimit: true, reelsWeeklyLimit: true },
    });
  }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
      select: { id: true, name: true, phone: true, logo: true, isActive: true, b2bCompanyId: true },
    });
  }

  async updateLogo(id: number, logoPath: string) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: { logo: logoPath },
      select: { id: true, name: true, logo: true },
    });
  }

  async toggleActive(id: number) {
    const company = await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: { isActive: !company.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.prisma.company.delete({ where: { id } });
    return { message: 'Kompaniya o\'chirildi' };
  }

  private async findOne(id: number) {
    const c = await this.prisma.company.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Kompaniya topilmadi');
    return c;
  }

  // ── Content limit config (singleton) ────────────────────────────────────

  async getContentLimit() {
    const config = await this.prisma.contentLimitConfig.findUnique({ where: { id: 1 } });
    return config ?? { id: 1, newsWeeklyLimit: 2, reelsWeeklyLimit: 2 };
  }

  async updateContentLimit(dto: ContentLimitDto) {
    return this.prisma.contentLimitConfig.upsert({
      where: { id: 1 },
      create: { id: 1, newsWeeklyLimit: dto.newsWeeklyLimit, reelsWeeklyLimit: dto.reelsWeeklyLimit },
      update: { newsWeeklyLimit: dto.newsWeeklyLimit, reelsWeeklyLimit: dto.reelsWeeklyLimit },
    });
  }
}
