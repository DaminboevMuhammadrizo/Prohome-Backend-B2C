import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateNewsCategoryDto, CreateNewsDto, UpdateNewsCategoryDto, UpdateNewsDto } from './dto/news.dto';

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
    status?: ContentStatus;
    categoryId?: number;
    masterId?: number;
    jobId?: number;
  }) {
    const { page = 1, limit = 10, status, categoryId, masterId, jobId } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status ?? ContentStatus.PUBLISHED };
    if (categoryId) where.categoryId = categoryId;
    if (masterId !== undefined) where.masterId = masterId;
    if (jobId !== undefined) where.jobId = jobId;

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

  async create(dto: CreateNewsDto) {
    return this.prisma.news.create({
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : dto.status === ContentStatus.PUBLISHED ? new Date() : null,
      },
      include: this.include,
    });
  }

  async update(id: number, dto: UpdateNewsDto) {
    await this.getById(id);
    return this.prisma.news.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
      include: this.include,
    });
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
