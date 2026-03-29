import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobService {
    constructor(private readonly prisma: PrismaService) { }

    async getAll() {
        return this.prisma.job.findMany({ orderBy: { createdAt: 'desc' } });
    }


    async getOne(id: number) {
        const job = await this.prisma.job.findUnique({ where: { id } });
        if (!job) throw new NotFoundException(`Job #${id} topilmadi`);
        return job;
    }


    async create(payload: CreateJobDto) {
        return this.prisma.job.create({ data: payload });
    }


    async update(id: number, payload: UpdateJobDto) {
        await this.getOne(id);
        return this.prisma.job.update({ where: { id }, data: payload });
    }


    async delete(id: number) {
        await this.getOne(id);
        return this.prisma.job.delete({ where: { id } });
    }
}
