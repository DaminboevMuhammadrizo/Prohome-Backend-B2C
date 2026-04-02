import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobService } from './job.service';

@ApiTags('Job Categories')
@Controller('job-categories')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: 'Kasb kategoriyalari ro‘yxati' })
  getAll() {
    return this.jobService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta kasb kategoriyasi' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Kasb kategoriyasi yaratish' })
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Kasb kategoriyasini yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Kasb kategoriyasini o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.delete(id);
  }
}
