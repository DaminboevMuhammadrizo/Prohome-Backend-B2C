import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { CreateSalaryTypeDto } from './dto/create.salary.dto';
import { UpdateSalaryTypeDto } from './dto/update.salary.dto';

@Injectable()
export class SalaryTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.salaryType.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { masterProfiles: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const salaryType = await this.prisma.salaryType.findUnique({
      where: { id },
    });

    if (!salaryType) {
      throw new NotFoundException('Salary type not found');
    }

    return salaryType;
  }

  async create(payload: CreateSalaryTypeDto) {
    const existing = await this.prisma.salaryType.findFirst({
      where: {
        OR: [
          { nameUz: payload.nameUz },
          { nameUzCyrl: payload.nameUzCyrl },
          { nameRu: payload.nameRu },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Salary type name already exists');
    }

    return this.prisma.salaryType.create({
      data: {
        nameRu: payload.nameRu,
        nameUz: payload.nameUz,
        nameUzCyrl: payload.nameUzCyrl,
      },
    });
  }

  async update(id: number, payload: UpdateSalaryTypeDto) {
    const salaryType = await this.prisma.salaryType.findUnique({
      where: { id },
    });

    if (!salaryType) {
      throw new NotFoundException('Salary type not found');
    }

    if (payload.nameUz || payload.nameRu || payload.nameUzCyrl) {
      const duplicate = await this.prisma.salaryType.findFirst({
        where: {
          OR: [
            payload.nameUz ? { nameUz: payload.nameUz } : {},
            payload.nameUzCyrl ? { nameUzCyrl: payload.nameUzCyrl } : {},
            payload.nameRu ? { nameRu: payload.nameRu } : {},
          ],
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException('Salary type name already exists');
      }
    }

    return this.prisma.salaryType.update({
      where: { id },
      data: {
        nameRu: payload.nameRu,
        nameUz: payload.nameUz,
        nameUzCyrl: payload.nameUzCyrl,
      },
    });
  }

  
  async remove(id: number) {
    const salaryType = await this.prisma.salaryType.findUnique({
      where: { id },
      include: { _count: { select: { masterProfiles: true } } },
    });

    if (!salaryType) {
      throw new NotFoundException('Salary type not found');
    }

    if (salaryType._count.masterProfiles > 0) {
      throw new ConflictException(
        'you are not allowed to delete this salary type',
      );
    }

    return this.prisma.salaryType.delete({
      where: { id },
    });
  }
}
