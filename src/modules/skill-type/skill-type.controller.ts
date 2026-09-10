import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateSkillTypeDto, SkillTypeService } from './skill-type.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { SkillStatus, UserRole } from '@prisma/client';

@ApiTags('Skill Types')
@UseInterceptors(HttpCacheInterceptor)
@CacheResource('skilltype')
@Controller('skill-types')
export class SkillTypeController {
  constructor(private readonly skillTypeService: SkillTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'Skill (kasb) turlari ro\'yxati',
    description: 'Masalan "Qurilish ishlari", "Muhandislik". Diqqat: javob endi `{ data: SkillType[], meta: {...} }` ko\'rinishida (oddiy massiv emas).',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 50 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq kasb turi ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Nomi bo\'yicha qidiruv' })
  @ApiQuery({ name: 'status', required: false, enum: SkillStatus })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('status') status?: SkillStatus,
  ) {
    return this.skillTypeService.getAll({ page: +page, limit: +limit, id: id ? +id : undefined, search, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta skill turi (skilllar bilan)' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.skillTypeService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Skill turi yaratish' })
  create(@Body() dto: CreateSkillTypeDto) {
    return this.skillTypeService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Skill turini yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.skillTypeService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Skill turini o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.skillTypeService.delete(id);
  }
}
