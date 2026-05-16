import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { SocialPlatform } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async getByMaster(masterId: number) {
    return this.prisma.social.findMany({ where: { masterId }, orderBy: { platform: 'asc' } });
  }

  async create(masterId: number, dto: { platform: SocialPlatform; url: string }) {
    const master = await this.prisma.master.findUnique({ where: { id: masterId } });
    if (!master) throw new NotFoundException('Usta topilmadi');
    return this.prisma.social.create({ data: { ...dto, masterId } });
  }

  async update(id: number, masterId: number, dto: { platform?: SocialPlatform; url?: string }) {
    const social = await this.prisma.social.findUnique({ where: { id } });
    if (!social) throw new NotFoundException('Ijtimoiy havola topilmadi');
    if (social.masterId !== masterId) throw new ForbiddenException('Ruxsat yo\'q');
    return this.prisma.social.update({ where: { id }, data: dto });
  }

  async delete(id: number, masterId: number) {
    const social = await this.prisma.social.findUnique({ where: { id } });
    if (!social) throw new NotFoundException('Ijtimoiy havola topilmadi');
    if (social.masterId !== masterId) throw new ForbiddenException('Ruxsat yo\'q');
    await this.prisma.social.delete({ where: { id } });
    return { message: 'Havola o\'chirildi' };
  }
}
