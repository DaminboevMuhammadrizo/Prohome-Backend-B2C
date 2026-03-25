import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from './dto/pagination.dto';
import { CreateUserDto } from './dto/create.user.dto';
import { UpdateUserDto } from './dto/updater.user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllActive(pagination: PaginationDto) {
    const page = pagination.page;
    const limit = pagination.limit;

    if (page && limit) {
      return this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          region: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    return this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        region: true,
      },
    });
  }

  async getOneUserActive(id: number) {
    return this.prisma.user.findUnique({
      where: {
        id,
        status: 'ACTIVE',
      },
      include: {
        region: true,
      },
    });
  }

  async getAllArchived(pagination: PaginationDto) {
    const page = pagination.page;
    const limit = pagination.limit;
    if (page && limit) {
      return this.prisma.user.findMany({
        where: {
          status: 'INACTIVE',
        },
        include: {
          region: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    return this.prisma.user.findMany({
      where: {
        status: 'INACTIVE',
      },
      include: {
        region: true,
      },
    });
  }

  async getOneUserArchived(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id: id,
        status: 'INACTIVE',
      },
      include: {
        region: true,
      },
    });
  }

  async createUser(payload: CreateUserDto) {
    const existsUser = await this.prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existsUser) throw new ConflictException('User already exists');

    if (payload.regionId) {
      const existsRegion = await this.prisma.region.findUnique({
        where: { id: payload.regionId },
      });
      if (!existsRegion) throw new NotFoundException('Region not found');
    }

    return this.prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        regionId: payload.regionId ? payload.regionId : null,
        age: payload.age,
        role: payload.role,
        status: payload.status,
        gender: payload.gender,
        email: payload.email,
      },
      include: { region: true },
    });
  }

  async updateUser(id: number, payload: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) throw new NotFoundException('User not found');

    if (payload.phone) {
      const existsPhone = await this.prisma.user.findFirst({
        where: {
          phone: payload.phone,
          NOT: { id: id },
        },
      });
      if (existsPhone && user.phone !== payload.phone)
        throw new ConflictException('Phone  already exists');
    }

    if (payload.regionId) {
      const existsRegion = await this.prisma.region.findUnique({
        where: { id: payload.regionId },
      });
      if (!existsRegion) throw new NotFoundException('Region not found');
    }

    return this.prisma.user.update({
      where: { id: id },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        age: payload.age,
        role: payload.role,
        status: payload.status,
        gender: payload.gender,
        email: payload.email,
        regionId: payload.regionId ? payload.regionId : undefined,
      },
      include: { region: true },
    });
  }

  async updateStatusToogle(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: id },
      data: { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    });
  }

  async deleteUser (id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.delete({
      where: { id: id },
    });
  }

}