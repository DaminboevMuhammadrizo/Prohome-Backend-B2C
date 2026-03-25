import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ApiOperation } from '@nestjs/swagger';
import { JobService } from './job.service';
import { UserRole } from '@prisma/client';

@Controller('job')
export class JobController {
    constructor(private readonly service: JobService) { }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.getOne(id);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Post()
    create(@Body() payload: CreateJobDto) {
        return this.service.create(payload);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateJobDto,
    ) {
        return this.service.update(id, payload);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
