import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { PaginationDto } from '../../dto/pagination.dto';
import { CreateMasterJobDto } from './dto/create.masterJob.dto';
import { UpdateMasterJobDto } from './dto/update.masterJob.dto';

@Injectable()
export class MasterJobService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(
    pagination: PaginationDto,
    query?: { jobId?: number; minExp?: number; search?: string },
  ) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.jobId) {
      const existJob = await this.prisma.job.findUnique({
        where: { id: query.jobId },
      });
      if (!existJob) throw new NotFoundException('Job not found');

      where.jobId = query.jobId;
    }

    if (query?.minExp) {
      where.experience = { gte: query.minExp };
    }

    if (query?.search) {
      where.desc = { contains: query.search, mode: 'insensitive' };
    }
    const [data, total] = await Promise.all([
      this.prisma.masterJob.findMany({
        where,
        include: {
          job: true,
          masterProfile: { include: { user: true } },
        },
        skip,
        take: limit,
        orderBy: { experience: 'desc' },
      }),

      this.prisma.masterJob.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getOneByMasterjobId(id: number) {
    const masterJob = await this.prisma.masterJob.findUnique({
      where: { id: id },
      include: {
        job: true,
        masterProfile: { include: { user: true } },
      },
    });

    if (!masterJob) throw new NotFoundException('Master job not found');

    return masterJob;
  }

  async getOneJobId(jobId: number) {
    const existsJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!existsJob) throw new NotFoundException('Job not found');

    const masterJob = await this.prisma.masterJob.findMany({
      where: { jobId: jobId },
      include: {
        job: true,
        masterProfile: { include: { user: true } },
      },
    });

    return masterJob;
  }

  async getTopMastersByJob(jobId: number, limit: number = 5) {
    const existsJob = await this.prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!existsJob) throw new NotFoundException('Job not found');

    return this.prisma.masterJob.findMany({
      where: { jobId: jobId },
      include: { masterProfile: { include: { user: true } }, job: true },
      orderBy: { experience: 'desc' },
      take: limit,
    });
  }

  async incrementExpirence(id: number) {
    const existsMasterJob = await this.prisma.masterJob.findUnique({
      where: { id: id },
      include: {
        job: true,
        masterProfile: { include: { user: true } },
      },
    });
    if (!existsMasterJob) throw new NotFoundException('Master job not found');

    return this.prisma.masterJob.update({
      where: { id: id },
      data: { experience: { increment: 1 } },
    });
  }

  async decrementExpirence(id: number) {
    const existsMasterJob = await this.prisma.masterJob.findUnique({
      where: { id: id },
      include: {
        job: true,
        masterProfile: { include: { user: true } },
      },
    });
    if (!existsMasterJob) throw new NotFoundException('Master job not found');

    if (existsMasterJob.experience > 0) {
      return this.prisma.masterJob.update({
        where: { id: id },
        data: { experience: { decrement: 1 } },
      });
    }

    return "You aren't allowed to decrement experience";
  }

  async create(payload: CreateMasterJobDto) {
    const { masterInfoId, jobId, experience, desc } = payload;

    const [master, job] = await Promise.all([
      this.prisma.masterProfile.findUnique({
        where: { id: masterInfoId },
      }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.masterJob.findFirst({
        where: { masterInfoId: masterInfoId, jobId: jobId },
      }),
    ]);

    if (!master) throw new NotFoundException('Master profile not found');
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.masterJob.create({
      data: {
        masterInfoId: masterInfoId,
        jobId: jobId,
        experience,
        desc,
      },
      include: { job: true },
    });
  }

  async update(id: number, payload: UpdateMasterJobDto) {
    const { masterInfoId, jobId, experience, desc } = payload;
    const masterJobId = id;

    const currentMasterJob = await this.prisma.masterJob.findUnique({
      where: { id: masterJobId },
    });
    if (!currentMasterJob) throw new NotFoundException('Master job topilmadi');

    const checks: Promise<any>[] = [];

    if (masterInfoId) {
      checks.push(
        this.prisma.masterProfile.findUnique({
          where: { id: masterInfoId },
        }),
      );
    } else {
      checks.push(Promise.resolve(true));
    }

    if (jobId) {
      checks.push(this.prisma.job.findUnique({ where: { id: jobId } }));
    } else {
      checks.push(Promise.resolve(true));
    }

    if (masterInfoId || jobId) {
      const mId = masterInfoId ? masterInfoId : currentMasterJob.masterInfoId;
      const jId = jobId ? jobId : currentMasterJob.jobId;

      checks.push(
        this.prisma.masterJob.findFirst({
          where: {
            masterInfoId: mId,
            jobId: jId,
            NOT: { id: masterJobId },
          },
        }),
      );
    } else {
      checks.push(Promise.resolve(null));
    }

    const [masterExists, jobExists, duplicateJob] = await Promise.all(checks);

    if (masterInfoId && !masterExists)
      throw new NotFoundException('Yangi Master profile topilmadi');
    if (jobId && !jobExists) throw new NotFoundException('Yangi Job topilmadi');
    if (duplicateJob)
      throw new ConflictException('Bu masterda ushbu kasb allaqachon mavjud');

    return this.prisma.masterJob.update({
      where: { id: masterJobId },
      data: {
        masterInfoId: masterInfoId ? masterInfoId : undefined,
        jobId: jobId ? jobId : undefined,
        experience: experience !== undefined ? experience : undefined,
        desc: desc !== undefined ? desc : undefined,
      },
      include: { job: true },
    });
  }
  
  async remove(id: number) {
    const existsMasterJob = await this.prisma.masterJob.findUnique({
      where: { id: id },
    });
    if (!existsMasterJob) throw new NotFoundException('Master job not found');

    return await this.prisma.masterJob.delete({
      where: { id: id },
    });
  }
}
