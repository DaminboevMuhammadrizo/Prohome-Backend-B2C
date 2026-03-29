import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateApTypeDto } from './dto/create-ap-type.dto';
import { UpdateApTypeDto } from './dto/update-ap-type.dto';

@Injectable()
export class ApTypeService {
    constructor(private readonly prisma: PrismaService) { }

    async getAll() {
        return this.prisma.apartmentType.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async getOne(id: number) {
        const apType = await this.prisma.apartmentType.findUnique({ where: { id } });
        if (!apType) throw new NotFoundException(`ApartmentType #${id} topilmadi`);
        return apType;
    }

    async create(payload: CreateApTypeDto) {
        return this.prisma.apartmentType.create({ data: payload });
    }

    async update(id: number, payload: UpdateApTypeDto) {
        await this.getOne(id);
        return this.prisma.apartmentType.update({ where: { id }, data: payload });
    }

    async delete(id: number) {
        await this.getOne(id);
        return this.prisma.apartmentType.delete({ where: { id } });
    }
}
