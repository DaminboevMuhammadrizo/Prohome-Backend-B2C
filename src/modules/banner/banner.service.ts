import { getPathInFileType } from 'src/common/types/generator.types';
import { PrismaService } from 'src/common/database/prisma.service';
import { urlGenerator } from 'src/common/types/generator.types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class BannerService {
    constructor(private readonly prisma: PrismaService, private readonly config: ConfigService,) { }


    private async deleteOldImage(img: string): Promise<void> {
        try {
            const filename = img.split('/').pop();
            if (!filename) return
            const folder = getPathInFileType(filename);
            const filePath = join(folder, filename);
            await unlink(filePath);
        } catch { }
    }

    async getAll() {
        return this.prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
    }


    async getOne(id: number) {
        const banner = await this.prisma.banner.findUnique({ where: { id } });
        if (!banner) throw new NotFoundException(`Banner #${id} topilmadi`);
        return banner;
    }


    async create(payload: CreateBannerDto, filename: string) {
        const img = urlGenerator(this.config, filename);
        return this.prisma.banner.create({ data: { ...payload, img } });
    }


    async update(id: number, payload: UpdateBannerDto, filename?: string) {
        const banner = await this.getOne(id);

        if (filename && banner.img) await this.deleteOldImage(banner.img);
        const img = filename ? urlGenerator(this.config, filename) : undefined;

        return this.prisma.banner.update({
            where: { id }, data: { ...payload, ...(img && { img }) }
        });
    }


    async delete(id: number) {
        await this.getOne(id);
        return this.prisma.banner.delete({ where: { id } });
    }
}
