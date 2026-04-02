import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { hashPassword } from 'src/common/config/bcrypt';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthUser } from 'src/common/types/auth-user.type';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePhone(phone: string): string {
    return phone.startsWith('+') ? phone : `+${phone}`;
  }

  private async ensureRegion(regionId?: number): Promise<void> {
    if (!regionId) {
      return;
    }

    const region = await this.prisma.region.findUnique({ where: { id: regionId } });

    if (!region) {
      throw new NotFoundException('Region topilmadi');
    }
  }

  private async ensureUniquePhone(phone?: string, userId?: number): Promise<string | undefined> {
    if (!phone) {
      return undefined;
    }

    const normalizedPhone = this.normalizePhone(phone);
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        NOT: userId ? { id: userId } : undefined,
      },
    });

    if (existingUser) {
      throw new ConflictException('Bu telefon raqam avval ro‘yxatdan o‘tgan');
    }

    return normalizedPhone;
  }

  async getMe(user: AuthUser) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        region: true,
        masterProfile: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!foundUser) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const { password, ...safeUser } = foundUser;
    return safeUser;
  }

  async getAll(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        include: {
          region: true,
          masterProfile: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: data.map(({ password, ...safeUser }) => safeUser),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        region: true,
        masterProfile: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }

  async updateMe(user: AuthUser, dto: UpdateUserMeDto) {
    await this.getOne(user.id);
    await this.ensureRegion(dto.regionId);
    const phone = await this.ensureUniquePhone(dto.phone, user.id);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        regionId: dto.regionId,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
      include: { region: true },
    });

    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.getOne(id);
    await this.ensureRegion(dto.regionId);
    const phone = await this.ensureUniquePhone(dto.phone, id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        regionId: dto.regionId,
        role: dto.role,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
      include: { region: true },
    });

    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async delete(id: number) {
    await this.getOne(id);
    return this.prisma.user.delete({ where: { id } });
  }
}
