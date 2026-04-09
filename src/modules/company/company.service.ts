import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import { unlinkFile } from 'src/common/types/file.cotroller.typpes';
import { urlGenerator } from 'src/common/types/generator.types';
import { assertCompanyAccess } from 'src/common/utils/access.util';
import { PhoneIdentityService } from 'src/common/services/phone-identity.service';
import { buildDateRange, normalizeSearch } from 'src/common/utils/query.util';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly phoneIdentityService: PhoneIdentityService,
        private readonly config: ConfigService,
    ) { }

    private buildWhere(query: CompanyQueryDto): Prisma.CompanyWhereInput {
        const search = normalizeSearch(query.search);

        return {
            isActive: query.isActive,
            isVerified: query.isVerified,
            createdAt: buildDateRange(query.createdFrom, query.createdTo),
            OR: search
                ? [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { website: { contains: search, mode: 'insensitive' } },
                ]
                : undefined,
        };
    }

    async getAll(query: CompanyQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const where = this.buildWhere(query);

        const [data, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            complexes: true,
                            views: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.company.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getOne(id: number) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                complexes: {
                    include: {
                        apartments: {
                            include: {
                                category: true,
                                seller: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                        layouts: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        complexes: true,
                        views: true,
                    },
                },
            },
        });

        if (!company) {
            throw new NotFoundException('Company topilmadi');
        }

        const apartments = company.complexes.flatMap((complex) => complex.apartments);
        const [leadCount, complexInterestCount, apartmentLikeCount] = await Promise.all([
            this.prisma.lead.count({ where: { companyId: company.id } }),
            this.prisma.complexInterest.count({
                where: { complex: { companyId: company.id } },
            }),
            this.prisma.apartmentLike.count({
                where: { apartment: { complex: { companyId: company.id } } },
            }),
        ]);

        const analytics = {
            complexCount: company.complexes.length,
            apartmentCount: apartments.length,
            soldApartmentCount: apartments.filter(
                (apartment) => apartment.dealStatus === 'SOLD',
            ).length,
            totalApartmentLikeCount: apartments.reduce(
                (sum, apartment) => sum + apartment.likeCount,
                0,
            ),
            totalApartmentViewCount: apartments.reduce(
                (sum, apartment) => sum + apartment.viewCount,
                0,
            ),
            companyViewCount: company.viewCount,
            leadCount,
            complexInterestCount,
            apartmentLikeCount,
        };

        return {
            ...company,
            analytics,
        };
    }

    async create(dto: CreateCompanyDto, logoFile?: Express.Multer.File) {
        if (!logoFile) {
            throw new BadRequestException('Company logo rasmi majburiy');
        }

        const phone = await this.phoneIdentityService.ensurePhoneAvailable({ phone: dto.phone });

        return this.prisma.company.create({
            data: {
                ...dto, phone,
                logo: urlGenerator(this.config, logoFile.filename),
                password: await hashPassword(dto.password),
            },
        });
    }

    async update(
        id: number,
        user: AuthUser,
        dto: UpdateCompanyDto,
        logoFile?: Express.Multer.File,
    ) {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company) throw new NotFoundException('Company topilmadi');

        assertCompanyAccess(company.id, user, 'Siz faqat ozingizning companyingizni yangilay olasiz');

        const phone = dto.phone
            ? await this.phoneIdentityService.ensurePhoneAvailable({
                phone: dto.phone, excludeCompanyId: id,
            }) : undefined;

        if (logoFile && company.logo) {
            unlinkFile(company.logo);
        }

        return this.prisma.company.update({
            where: { id },
            data: {
                ...dto,
                phone,
                logo: logoFile ? urlGenerator(this.config, logoFile.filename) : undefined,
                password: dto.password ? await hashPassword(dto.password) : undefined,
            },
        });
    }

    async setActiveStatus(id: number, isActive: boolean) {
        await this.getOne(id);
        return this.prisma.company.update({
            where: { id },
            data: { isActive },
        });
    }

    async addView(id: number, user?: AuthUser) {
        await this.prisma.$transaction([
            this.prisma.companyView.create({
                data: {
                    companyId: id,
                    userId: user?.id,
                },
            }),
            this.prisma.company.update({
                where: { id },
                data: {
                    viewCount: {
                        increment: 1,
                    },
                },
            }),
        ]);

        return { message: 'Company view saqlandi' };
    }

    async delete(id: number) {
        const company = await this.getOne(id);
        if (company.logo) {
            unlinkFile(company.logo);
        }
        return this.prisma.company.delete({ where: { id } });
    }
}
