import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class RegionService {
    constructor(private readonly prisma: PrismaService) { }

    async getAll() {
        return this.prisma.region.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async getOne(id: number) {
        const region = await this.prisma.region.findUnique({ where: { id } });
        if (!region) throw new NotFoundException(`Region #${id} topilmadi`);
        return region;
    }

    async create(payload: CreateRegionDto) {
        return this.prisma.region.create({ data: payload });
    }

    async update(id: number, payload: UpdateRegionDto) {
        await this.getOne(id);
        return this.prisma.region.update({ where: { id }, data: payload });
    }

    async delete(id: number) {
        await this.getOne(id);
        return this.prisma.region.delete({ where: { id } });
    }
}
