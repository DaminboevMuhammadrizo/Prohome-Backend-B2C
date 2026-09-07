import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ChangeJobStatusDto, CreateJobDto, UpdateJobDto } from './dto/create-job.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { JobStatus, UserRole } from '@prisma/client';
import { JobService } from './job.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
    constructor(
        private readonly jobService: JobService,
        private readonly jwtService: JwtService,
    ) { }

    private extractUserId(req: any): number | undefined {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return undefined;
            const payload = this.jwtService.decode(token) as JwtPayload | null;
            return payload?.id ?? undefined;
        } catch {
            return undefined;
        }
    }

    @Get()
    @ApiOperation({
        summary: 'Ish e\'lonlar ro\'yxati (jadval uchun — har ustun bo\'yicha filtr)',
        description: '`status` berilmasa faqat OPEN e\'lonlar qaytadi. Javob: `{ data: Job[], meta: {page, limit, total, totalPages} }`.',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 20 })
    @ApiQuery({ name: 'id', required: false, description: 'Aniq e\'lon ID si' })
    @ApiQuery({ name: 'search', required: false, description: 'Sarlavha, tavsif yoki telefon bo\'yicha umumiy qidiruv' })
    @ApiQuery({ name: 'status', required: false, enum: JobStatus, description: 'Berilmasa — faqat OPEN' })
    @ApiQuery({ name: 'skillTypeId', required: false, description: 'Kasb turi ID si (/skill-types dan)' })
    @ApiQuery({ name: 'locationId', required: false, description: 'Joylashuv ID si' })
    @ApiQuery({ name: 'userId', required: false, description: 'Faqat shu foydalanuvchi e\'lonlari' })
    @ApiQuery({ name: 'minPrice', required: false, description: 'Narx — shundan boshlab' })
    @ApiQuery({ name: 'maxPrice', required: false, description: 'Narx — shungacha' })
    @ApiQuery({ name: 'createdFrom', required: false, description: 'Joylangan sana — shundan boshlab', example: '2026-01-01' })
    @ApiQuery({ name: 'createdTo', required: false, description: 'Joylangan sana — shungacha', example: '2026-12-31' })
    getAll(
        @Req() req: any,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('id') id?: string,
        @Query('search') search?: string,
        @Query('status') status?: JobStatus,
        @Query('skillTypeId') skillTypeId?: string,
        @Query('locationId') locationId?: string,
        @Query('userId') userId?: string,
        @Query('minPrice') minPrice?: string,
        @Query('maxPrice') maxPrice?: string,
        @Query('createdFrom') createdFrom?: string,
        @Query('createdTo') createdTo?: string,
    ) {
        return this.jobService.getAll({
            page: +page, limit: +limit, search, status,
            id: id ? +id : undefined,
            skillTypeId: skillTypeId ? +skillTypeId : undefined,
            locationId: locationId ? +locationId : undefined,
            userId: userId ? +userId : undefined,
            minPrice: minPrice ? +minPrice : undefined,
            maxPrice: maxPrice ? +maxPrice : undefined,
            subscriberUserId: this.extractUserId(req),
            createdFrom, createdTo,
        });
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
