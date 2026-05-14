import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';
import { PrismaService } from 'src/common/database/prisma.service';
import { ChangeUserStatusDto } from './dto/user-action.dto';
import { hashPassword } from 'src/common/config/bcrypt';
import { CreateUserDto } from './dto/create.user.dto';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    private userSelect = {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        age: true,
        role: true,
        status: true,
        statusAt: true,
        locationId: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, name: true, type: true } },
        master: { select: { id: true, isFree: true, experience: true, profileImg: true } },
        _count: { select: { realEstates: true, ratings: true, jobs: true } },
    };

    async getMe(userId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: this.userSelect });
        if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
        return user;
    }

    async updateMe(userId: number, dto: UpdateUserMeDto) {
        const data: any = { ...dto };
        if (dto.password) data.password = await hashPassword(dto.password);
        delete data.role;
        if (dto.locationId) {
            const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
            if (!loc) throw new NotFoundException('Joylashuv topilmadi');
        }
        return this.prisma.user.update({ where: { id: userId }, data, select: this.userSelect });
    }

    async getAll(page = 1, limit = 20, search?: string, status?: UserStatus) {
        const skip = (page - 1) * limit;
        const where: Prisma.UserWhereInput = { role: UserRole.USER };

        if (search) {
            where.OR = [
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: this.userSelect }),
            this.prisma.user.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async getById(id: number) {
        const user = await this.prisma.user.findUnique({ where: { id }, select: this.userSelect });
        if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
        return user;
    }

    async create(dto: CreateUserDto) {
        if (!dto.phone && !dto.email) throw new BadRequestException('Telefon yoki email kerak');
        if (dto.phone) {
            const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
            if (exists) throw new BadRequestException('Bu telefon raqam band');
        }
        if (dto.email) {
            const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (exists) throw new BadRequestException('Bu email band');
        }
        if (dto.locationId) {
            const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
            if (!loc) throw new NotFoundException('Joylashuv topilmadi');
        }
        const data: any = { ...dto };
        if (dto.password) data.password = await hashPassword(dto.password);
        return this.prisma.user.create({ data, select: this.userSelect });
    }

    async update(id: number, dto: UpdateUserDto) {
        await this.getById(id);
        if (dto.phone) {
            const exists = await this.prisma.user.findFirst({ where: { phone: dto.phone, NOT: { id } } });
            if (exists) throw new BadRequestException('Bu telefon raqam band');
        }
        if (dto.email) {
            const exists = await this.prisma.user.findFirst({ where: { email: dto.email, NOT: { id } } });
            if (exists) throw new BadRequestException('Bu email band');
        }
        if (dto.locationId) {
            const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
            if (!loc) throw new NotFoundException('Joylashuv topilmadi');
        }
        const data: any = { ...dto };
        if (dto.password) data.password = await hashPassword(dto.password);
        return this.prisma.user.update({ where: { id }, data, select: this.userSelect });
    }

    async changeStatus(id: number, dto: ChangeUserStatusDto) {
        const user = await this.getById(id);
        if ((user as any).role === 'SUPERADMIN') throw new ForbiddenException('Superadmin statusini o\'zgartirib bo\'lmaydi');
        return this.prisma.user.update({
            where: { id },
            data: { status: dto.status, statusAt: new Date() },
            select: this.userSelect,
        });
    }

    async delete(id: number) {
        await this.getById(id);
        await this.prisma.user.delete({ where: { id } });
        return { message: 'Foydalanuvchi o\'chirildi' };
    }
}
