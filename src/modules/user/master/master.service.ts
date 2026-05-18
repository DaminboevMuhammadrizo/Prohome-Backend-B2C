import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { hashPassword } from 'src/common/config/bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateMasterByAdminDto, RegisterAsMasterDto, UpdateMasterDto } from './dto/create-master.dto';

@Injectable()
export class MasterService {
  constructor(private readonly prisma: PrismaService) {}

  private masterListSelect = {
    id: true,
    profileImg: true,
    experience: true,
    isFree: true,
    likeCount: true,
    viewCount: true,
    createdAt: true,
    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
    skills: {
      take: 1,
      select: {
        skill: { select: { id: true, name: true, type: { select: { id: true, name: true } } } },
      },
    },
    _count: { select: { ratings: true } },
  };

  private masterDetailSelect = {
    id: true,
    profileImg: true,
    experience: true,
    bio: true,
    salary: true,
    workImgs: true,
    isFree: true,
    likeCount: true,
    viewCount: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true } },
    skills: {
      select: {
        skill: { select: { id: true, name: true, type: { select: { id: true, name: true } } } },
      },
    },
    socials: { select: { id: true, platform: true, url: true } },
    _count: { select: { ratings: true } },
  };

  async getStats() {
    const [total, free, avgRatingResult] = await Promise.all([
      this.prisma.master.count(),
      this.prisma.master.count({ where: { isFree: true } }),
      this.prisma.rating.aggregate({ _avg: { rating: true } }),
    ]);
    return {
      total,
      free,
      avgRating: avgRatingResult._avg.rating
        ? Math.round(avgRatingResult._avg.rating * 10) / 10
        : null,
    };
  }

  async getAll(page = 1, limit = 20, search?: string, isFree?: boolean, skillTypeId?: number, subscriberUserId?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (skillTypeId) where.skills = { some: { skill: { typeId: skillTypeId } } };
    if (isFree !== undefined) where.isFree = isFree;
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.master.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.masterListSelect,
      }),
      this.prisma.master.count({ where }),
    ]);

    if (data.length === 0 && (search || skillTypeId || isFree !== undefined)) {
      const query = JSON.stringify({ type: 'master', search, skillTypeId, isFree });
      this.prisma.searchSubscription.create({ data: { query, userId: subscriberUserId ?? null } }).catch(() => null);
    }

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: number) {
    const master = await this.prisma.master.findUnique({ where: { id }, select: this.masterDetailSelect });
    if (!master) throw new NotFoundException('Usta topilmadi');

    const firstSkillTypeId = (master.skills[0] as any)?.skill?.type?.id;
    let similar: any[] = [];
    if (firstSkillTypeId) {
      similar = await this.prisma.master.findMany({
        where: { id: { not: id }, skills: { some: { skill: { typeId: firstSkillTypeId } } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: this.masterListSelect,
      });
    }

    return { ...master, similar };
  }

  async getByUserId(userId: number) {
    const master = await this.prisma.master.findUnique({ where: { userId }, select: this.masterDetailSelect });
    if (!master) throw new NotFoundException('Usta topilmadi');
    return master;
  }

  async createByAdmin(dto: CreateMasterByAdminDto) {
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

    if (dto.skillIds?.length) {
      const skills = await this.prisma.skills.findMany({ where: { id: { in: dto.skillIds } } });
      if (skills.length !== dto.skillIds.length) throw new NotFoundException('Bir yoki bir nechta skill topilmadi');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        age: dto.age,
        role: UserRole.MASTER,
        status: UserStatus.ACTIVE,
        locationId: dto.locationId,
        password: dto.password ? await hashPassword(dto.password) : undefined,
      },
    });

    const master = await this.prisma.master.create({
      data: {
        userId: user.id,
        experience: dto.experience ?? 0,
        bio: dto.bio,
        salary: dto.salary ? dto.salary : undefined,
      },
    });

    if (dto.skillIds?.length) {
      await this.prisma.masterSkills.createMany({
        data: dto.skillIds.map((skillId) => ({ masterId: master.id, skillId })),
        skipDuplicates: true,
      });
    }

    return this.getById(master.id);
  }

  async registerAsMaster(userId: number, dto: RegisterAsMasterDto) {
    const existing = await this.prisma.master.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException('Siz allaqachon ustasiz');

    if (dto.skillIds?.length) {
      const skills = await this.prisma.skills.findMany({ where: { id: { in: dto.skillIds } } });
      if (skills.length !== dto.skillIds.length) throw new NotFoundException('Bir yoki bir nechta skill topilmadi');
    }

    const master = await this.prisma.master.create({
      data: { userId, experience: dto.experience ?? 0, bio: dto.bio, salary: dto.salary ?? undefined },
    });

    if (dto.skillIds?.length) {
      await this.prisma.masterSkills.createMany({
        data: dto.skillIds.map((skillId) => ({ masterId: master.id, skillId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.user.update({ where: { id: userId }, data: { role: UserRole.MASTER } });
    return this.getById(master.id);
  }

  async update(id: number, dto: UpdateMasterDto) {
    await this.getById(id);

    if (dto.skillIds !== undefined) {
      await this.prisma.masterSkills.deleteMany({ where: { masterId: id } });
      if (dto.skillIds.length > 0) {
        await this.prisma.masterSkills.createMany({
          data: dto.skillIds.map((skillId) => ({ masterId: id, skillId })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.master.update({
      where: { id },
      data: { experience: dto.experience, bio: dto.bio, salary: dto.salary ? dto.salary : undefined },
      select: this.masterDetailSelect,
    });
  }

  async toggleFree(id: number) {
    const master = await this.getById(id);
    return this.prisma.master.update({
      where: { id },
      data: { isFree: !(master as any).isFree },
      select: this.masterDetailSelect,
    });
  }

  async delete(id: number) {
    const master = await this.getById(id);
    await this.prisma.master.delete({ where: { id } });
    await this.prisma.user.update({
      where: { id: (master as any).user.id },
      data: { role: UserRole.USER },
    });
    return { message: "Usta o'chirildi" };
  }

  async uploadProfileImg(id: number, filename: string) {
    return this.prisma.master.update({
      where: { id },
      data: { profileImg: `image/${filename}` },
      select: this.masterDetailSelect,
    });
  }

  async recordView(id: number) {
    await this.getById(id);
    return this.prisma.master.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });
  }

  async toggleLike(masterId: number, userId: number) {
    await this.getById(masterId);
    const existing = await this.prisma.masterLike.findUnique({
      where: { userId_masterId: { userId, masterId } },
    });
    if (existing) {
      await this.prisma.masterLike.delete({ where: { userId_masterId: { userId, masterId } } });
      const updated = await this.prisma.master.update({
        where: { id: masterId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });
      return { liked: false, likeCount: updated.likeCount };
    } else {
      await this.prisma.masterLike.create({ data: { userId, masterId } });
      const updated = await this.prisma.master.update({
        where: { id: masterId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return { liked: true, likeCount: updated.likeCount };
    }
  }

  async addWorkImg(id: number, filename: string) {
    const master = await this.prisma.master.findUnique({ where: { id } });
    if (!master) throw new NotFoundException('Usta topilmadi');
    return this.prisma.master.update({
      where: { id },
      data: { workImgs: { push: `image/${filename}` } },
      select: this.masterDetailSelect,
    });
  }

  async deleteImg(userId: number, imgname: string) {
    const master = await this.prisma.master.findUnique({ where: { userId } });
    if (!master) throw new NotFoundException('Usta topilmadi');

    const storedPath = `image/${imgname}`;
    const isProfileImg = master.profileImg === storedPath;
    const isWorkImg = master.workImgs.includes(storedPath);

    if (!isProfileImg && !isWorkImg) throw new ForbiddenException('Bu rasm sizga tegishli emas');

    const filePath = join(process.cwd(), 'core', 'uploads', 'images', imgname);
    await unlink(filePath).catch(() => null);

    if (isProfileImg) {
      await this.prisma.master.update({ where: { id: master.id }, data: { profileImg: null } });
    } else {
      await this.prisma.master.update({
        where: { id: master.id },
        data: { workImgs: master.workImgs.filter((w) => w !== storedPath) },
      });
    }

    return { message: 'Rasm o\'chirildi' };
  }
}
