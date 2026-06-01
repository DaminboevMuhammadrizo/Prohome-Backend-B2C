import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ContentStatus, UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateReelDto, UpdateReelDto } from './dto/reels.dto';
import { ReelsService } from './reels.service';

@ApiTags('Reels')
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get()
  @ApiOperation({ summary: "Reels ro'yxati (sahifalangan)" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'masterId', required: false })
  @ApiQuery({ name: 'jobId', required: false })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: ContentStatus,
    @Query('masterId') masterId?: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.reelsService.getAll({
      page: +page, limit: +limit, status,
      masterId: masterId ? +masterId : undefined,
      jobId: jobId ? +jobId : undefined,
    });
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Reel yaratish (admin)' })
  create(@Body() dto: CreateReelDto) {
    return this.reelsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Bitta reel (ko'rishlar avtomatik ko'payadi)" })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.reelsService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Reelni yangilash (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReelDto) {
    return this.reelsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: "Reelni o'chirish (admin)" })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.reelsService.delete(id);
  }
}
