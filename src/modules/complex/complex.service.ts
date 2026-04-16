import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { unlinkFile } from 'src/common/types/file.cotroller.typpes';
import { AuthUser } from 'src/common/types/auth-user.type';
import { assertCompanyAccess, isPrivilegedRole } from 'src/common/utils/access.util';
import { generateUrlsFromFiles, replaceImages } from 'src/common/utils/helper';
import { buildDateRange, normalizeSearch } from 'src/common/utils/query.util';
import { ApartmentQueryDto } from 'src/modules/apartment/dto/apartment-query.dto';
import { buildApartmentWhere } from 'src/modules/apartment/utils/apartment-query.util';
import { CreateComplexDto } from './dto/create-complex.dto';
import { ComplexQueryDto } from './dto/complex-query.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';

@Injectable()
export class ComplexService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) { }

    private async ensureRelations(companyId?: number, regionId?: number) {
        if (companyId) {
            const company = await this.prisma.company.findUnique({ where: { id: companyId } });
            if (!company) {
                throw new NotFoundException('Company topilmadi');
            }
        }

        if (regionId) {
            const region = await this.prisma.region.findUnique({ where: { id: regionId } });
            if (!region) {
                throw new NotFoundException('Region topilmadi');
            }
        }
    }

    private async assertCanManage(companyId: number, user: AuthUser) {
        if (isPrivilegedRole(user.role)) {
            return;
        }

        const company = await this.prisma.company.findUnique({ where: { id: companyId } });

        if (!company) {
            throw new NotFoundException('Company topilmadi');
        }

        assertCompanyAccess(
            company.id,
            user,
            'Siz bu company complexlarini boshqara olmaysiz',
        );
    }

    private buildWhere(query: ComplexQueryDto): Prisma.ComplexWhereInput {
        const search = normalizeSearch(query.search);

        return {
            companyId: query.companyId,
            regionId: query.regionId,
            createdAt: buildDateRange(query.createdFrom, query.createdTo),
            OR: search
                ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { descriptionUz: { contains: search, mode: 'insensitive' } },
                    { descriptionUzCyrl: { contains: search, mode: 'insensitive' } },
                    { descriptionRu: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                    { company: { name: { contains: search, mode: 'insensitive' } } },
                ]
                : undefined,
        };
    }

    async getAll(query: ComplexQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const where = this.buildWhere(query);

        const [data, total] = await Promise.all([
            this.prisma.complex.findMany({
                where,
                include: {
                    company: true,
                    region: true,
                    layouts: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.complex.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async getOne(id: number) {
        const complex = await this.prisma.complex.findUnique({
            where: { id },
            include: {
                company: true,
                region: true,
                layouts: true,
                apartments: true,
            },
        });

        if (!complex) throw new NotFoundException('Complex topilmadi');
        return complex;
    }

    async getApartments(id: number, query: ApartmentQueryDto) {
        await this.getOne(id);

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const where = buildApartmentWhere(query, { complexId: id });

        const [data, total] = await Promise.all([
            this.prisma.apartment.findMany({
                where,
                include: {
                    region: true,
                    category: true,
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    complex: true,
                    layout: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.apartment.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getCottages(id: number, query: ApartmentQueryDto) {
        await this.getOne(id);

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const where = buildApartmentWhere(query, {
            complexId: id,
            isCottage: true,
        });

        const [data, total] = await Promise.all([
            this.prisma.apartment.findMany({
                where,
                include: {
                    region: true,
                    category: true,
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    complex: true,
                    layout: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.apartment.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async create(
        user: AuthUser,
        dto: CreateComplexDto,
        images?: Express.Multer.File[],
    ) {
        if (!images?.length) {
            throw new BadRequestException('Complex uchun kamida bitta rasm majburiy');
        }

        await this.ensureRelations(dto.companyId, dto.regionId);
        await this.assertCanManage(dto.companyId, user);
        return this.prisma.complex.create({
            data: {
                ...dto,
                images: generateUrlsFromFiles(images, this.config),
            },
        });
    }

    async update(
        id: number,
        user: AuthUser,
        dto: UpdateComplexDto,
        images?: Express.Multer.File[],
    ) {
        const complex = await this.prisma.complex.findUnique({ where: { id } });

        if (!complex) {
            throw new NotFoundException('Complex topilmadi');
        }

        await this.assertCanManage(complex.companyId, user);
        await this.ensureRelations(dto.companyId, dto.regionId);

        if (dto.companyId) {
            await this.assertCanManage(dto.companyId, user);
        }

        return this.prisma.complex.update({
            where: { id },
            data: {
                ...dto,
                images: replaceImages(images, complex.images, this.config),
            },
        });
    }

    async delete(id: number, user: AuthUser) {
        const complex = await this.prisma.complex.findUnique({ where: { id } });

        if (!complex) {
            throw new NotFoundException('Complex topilmadi');
        }

        await this.assertCanManage(complex.companyId, user);
        complex.images.forEach((image) => unlinkFile(image));
        return this.prisma.complex.delete({ where: { id } });
    }
}
