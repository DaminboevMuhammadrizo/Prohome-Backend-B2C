import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateNewsCategoryDto, CreateNewsDto, UpdateNewsCategoryDto, UpdateNewsDto } from './dto/news.dto';

function toSlug(title: string): string {
  const map: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d',
    'е':'e','ё':'yo','ж':'zh','з':'z','и':'i',
    'й':'y','к':'k','л':'l','м':'m','н':'n',
    'о':'o','п':'p','р':'r','с':'s','т':'t',
    'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch',
    'ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'',
    'э':'e','ю':'yu','я':'ya',
    'ʻ':'','ʼ':'',
  };
  return title
    .toLowerCase()
    .split('')
    .map(c => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

async function uniqueSlug(base: string, check: (slug: string) => Promise<boolean>): Promise<string> {
  if (await check(base)) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (await check(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    category: { select: { id: true, name: true } },
    master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    job: { select: { id: true, title: true } },
  };

  async getAll(params: {
    page?: number;
    limit?: number;
    id?: number;
    search?: string;
    status?: ContentStatus;
    categoryId?: number;
    masterId?: number;
    jobId?: number;
    companyId?: number;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const { page = 1, limit = 10, id, search, status, categoryId, masterId, jobId, companyId, createdFrom, createdTo } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status ?? ContentStatus.PUBLISHED };
    if (id !== undefined) where.id = id;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
    if (categoryId) where.categoryId = categoryId;
    if (masterId !== undefined) where.masterId = masterId;
    if (jobId !== undefined) where.jobId = jobId;
    if (companyId !== undefined) where.companyId = companyId;
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = new Date(createdFrom);
      if (createdTo) where.createdAt.lte = new Date(createdTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.news.findMany({
        where, skip, take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, title: true, slug: true, excerpt: true, coverImage: true,
          status: true, publishedAt: true, viewCount: true, createdAt: true,
          category: { select: { id: true, name: true } },
          master: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
          job: { select: { id: true, title: true } },
        },
      }),
      this.prisma.news.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getCategories() {
    return this.prisma.newsCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: number) {
    const news = await this.prisma.news.findUnique({ where: { id }, include: this.include });
    if (!news) throw new NotFoundException('Yangilik topilmadi');
    await this.prisma.news.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return news;
  }

  async getBySlug(slug: string) {
    const news = await this.prisma.news.findUnique({ where: { slug }, include: this.include });
    if (!news) throw new NotFoundException('Yangilik topilmadi');
    await this.prisma.news.update({ where: { id: news.id }, data: { viewCount: { increment: 1 } } });
    return news;
  }

  private async checkCompanyWeeklyLimit(companyId: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { newsWeeklyLimit: true } });
    const limit = company?.newsWeeklyLimit ?? 2;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await this.prisma.news.count({ where: { companyId, createdAt: { gte: weekAgo } } });
    if (count >= limit) throw new BadRequestException(`Kompaniya haftada ${limit} tadan ko'p yangilik qo'ya olmaydi`);
  }

  async create(dto: CreateNewsDto) {
    if (dto.companyId) await this.checkCompanyWeeklyLimit(dto.companyId);

    // Slug kiritilmasa yoki bo'sh bo'lsa — sarlavhadan avtomatik generatsiya
    const baseSlug = dto.slug?.trim() || toSlug(dto.title);
    const slug = await uniqueSlug(baseSlug, async (s) => {
      const exists = await this.prisma.news.findUnique({ where: { slug: s }, select: { id: true } });
      return !exists;
    });

    try {
      return await this.prisma.news.create({
        data: {
          ...dto,
          slug,
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : dto.status === ContentStatus.PUBLISHED ? new Date() : null,
        },
        include: this.include,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Bu slug allaqachon mavjud, boshqa nom kiriting');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateNewsDto) {
    await this.getById(id);

    // Slug o'zgartirilayotgan bo'lsa — unique ekanini tekshir
    if (dto.slug) {
      const existing = await this.prisma.news.findUnique({ where: { slug: dto.slug }, select: { id: true } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Bu slug allaqachon boshqa yangilikda ishlatilgan');
      }
    }

    try {
      return await this.prisma.news.update({
        where: { id },
        data: {
          ...dto,
          publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        },
        include: this.include,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Bu slug allaqachon mavjud');
      }
      throw e;
    }
  }

  async delete(id: number) {
    await this.getById(id);
    await this.prisma.news.delete({ where: { id } });
    return { message: 'Yangilik o\'chirildi' };
  }

  async createCategory(dto: CreateNewsCategoryDto) {
    return this.prisma.newsCategory.create({ data: { name: dto.name } });
  }

  async updateCategory(id: number, dto: UpdateNewsCategoryDto) {
    const cat = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Kategoriya topilmadi');
    return this.prisma.newsCategory.update({ where: { id }, data: { name: dto.name } });
  }

  async deleteCategory(id: number) {
    const cat = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Kategoriya topilmadi');
    await this.prisma.newsCategory.delete({ where: { id } });
    return { message: 'Kategoriya o\'chirildi' };
  }
}
