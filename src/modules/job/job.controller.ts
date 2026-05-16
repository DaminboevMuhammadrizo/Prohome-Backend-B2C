import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ChangeJobStatusDto, CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { JobStatus, UserRole } from '@prisma/client';
import { JobService } from './job.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
    constructor(private readonly jobService: JobService) { }

    @Get()
    @ApiOperation({ summary: 'Ish e\'lonlar ro\'yxati' })
    getAll(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('search') search?: string,
        @Query('status') status?: JobStatus,
        @Query('skillTypeId') skillTypeId?: string,
        @Query('locationId') locationId?: string,
    ) {
        return this.jobService.getAll({ page: +page, limit: +limit, search, status, skillTypeId: skillTypeId ? +skillTypeId : undefined, locationId: locationId ? +locationId : undefined });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta ish e\'loni' })
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.jobService.getById(id);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post()
    @ApiOperation({ summary: 'Ish e\'loni qo\'shish' })
    create(@UserData() user: JwtPayload, @Body() dto: CreateJobDto) {
        return this.jobService.create(user.id, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Patch(':id')
    @ApiOperation({ summary: 'Ish e\'lonini yangilash' })
    update(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload, @Body() dto: UpdateJobDto) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.jobService.update(id, user.id, isAdmin, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Patch(':id/status')
    @ApiOperation({ summary: 'Ish statusini o\'zgartirish (OPEN/IN_PROGRESS/COMPLETED/CANCELLED)' })
    changeStatus(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload, @Body() dto: ChangeJobStatusDto) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.jobService.changeStatus(id, user.id, isAdmin, dto);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Delete(':id')
    @ApiOperation({ summary: 'Ish e\'lonini o\'chirish' })
    delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
        return this.jobService.delete(id, user.id, isAdmin);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post(':id/like')
    @ApiOperation({ summary: 'Like bosish/olib tashlash' })
    toggleLike(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.jobService.toggleLike(id, user.id);
    }

    @ApiBearerAuth()
    @UseGuards(GuardService)
    @Post(':id/view')
    @ApiOperation({ summary: 'Ko\'rishni qayd etish' })
    recordView(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.jobService.recordView(id, user.id);
    }
}
