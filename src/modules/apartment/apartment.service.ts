import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { urlGenerator, getPathInFileType } from 'src/common/types/generator.types';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ApartmentService {
    constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) { }

    private async deleteOldImage(img: string): Promise<void> {
        try {
            const filename = img.split('/').pop();
            if (!filename) return;
            const folder = getPathInFileType(filename);
            const filePath = join(folder, filename);
            await unlink(filePath);
        } catch { }
    }

    async getAll() {
        return this.prisma.apartment.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                apartmentType: true,
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                },
            },
        });
    }


    async getOne(id: number) {
        const apartment = await this.prisma.apartment.findUnique({
            where: { id },
            include: {
                apartmentType: true,
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                },
            },
        });
        if (!apartment) throw new NotFoundException(`Apartment #${id} topilmadi`);
        return apartment;
    }


    async create(payload: CreateApartmentDto, sellerId: number, filenames: string[]) {
        const img = filenames.map((f) => urlGenerator(this.config, f));
        return this.prisma.apartment.create({ data: { ...payload, img, sellerId } });
    }


    async update(id: number, payload: UpdateApartmentDto, filenames?: string[]) {
        const apartment = await this.getOne(id);

        if (filenames && filenames.length > 0)
            for (const oldImg of apartment.img) await this.deleteOldImage(oldImg);

        const img = filenames && filenames.length > 0 ? filenames.map((f) => urlGenerator(this.config, f)) : undefined;

        return this.prisma.apartment.update({
            where: { id },
            data: { ...payload, ...(img && { img }) }
        });
    }


    async delete(id: number) {
        const apartment = await this.getOne(id);
        for (const oldImg of apartment.img) await this.deleteOldImage(oldImg);
        return this.prisma.apartment.delete({ where: { id } });
    }
}
