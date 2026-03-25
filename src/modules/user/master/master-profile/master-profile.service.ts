import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from '../../dto/pagination.dto';
import { CreateMasterProfileDto } from './dto/create.master.profile.dto';
import { UpdateMasterProfileDto } from './dto/update.master-profile.dto';

@Injectable()
export class MasterProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.masterProfile.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
          salaryType: true,
          masterJobs: { include: { job: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.masterProfile.count(),
    ]);

    return {
      data,
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async getMyProfile(userId: number) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: userId },
      include: {
        user: true,
        salaryType: true,
        masterJobs: { include: { job: true } },
        ratings: true,
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async create(userId: number, payload: CreateMasterProfileDto) {
    const existsUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existsUser) throw new NotFoundException('User not found');

    const existingProfile = await this.prisma.masterProfile.findUnique({
      where: { userId: userId },
    });
    if (existingProfile) {
      throw new ConflictException('Master profile already exists');
    }

    const salaryType = await this.prisma.salaryType.findUnique({
      where: { id: payload.salaryTypeId },
    });
    if (!salaryType) throw new NotFoundException('Salary type not found');

    return this.prisma.masterProfile.create({
      data: {
        userId: userId,
        experience: payload.experience,
        salary: payload.salary,
        salaryTypeId: payload.salaryTypeId,
        address: payload.address,
      },
      include: {
        user: true,
        salaryType: true,
      },
    });
  }

  async update(userId: number, payload: UpdateMasterProfileDto) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: userId },
    });

    if (!profile) throw new NotFoundException('Profile not found');

    if (payload.salaryTypeId) {
      const salaryType = await this.prisma.salaryType.findUnique({
        where: { id: payload.salaryTypeId },
      });
      if (!salaryType) throw new NotFoundException('New Salary type not found');
    }

    return this.prisma.masterProfile.update({
      where: { userId: userId },
      data: {
        experience: payload.experience,
        salary: payload.salary,
        salaryTypeId: payload.salaryTypeId,
        address: payload.address,
      },
      include: { salaryType: true },
    });
  }

  async remove(userId: number) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId: userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    return this.prisma.masterProfile.delete({
      where: { userId: userId },
      include:{user:true}
    });
  }
}
