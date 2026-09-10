import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { SkillStatus, UserRole } from '@prisma/client';
import { SkillsService } from './skills.service';

@ApiTags('Skills')
@UseInterceptors(HttpCacheInterceptor)
@CacheResource('skill')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({
    summary: 'Skilllar ro\'yxati (bitta kasb turi ichidagi ko\'nikmalar)',
    description: 'Masalan "Santexnik", "Elektrik" (typeId=Muhandislik). Diqqat: javob endi `{ data: Skills[], meta: {...} }` ko\'rinishida.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 50 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq skill ID si' })
  @ApiQuery({ name: 'search', required: false, description: 'Nomi bo\'yicha qidiruv' })
  @ApiQuery({ name: 'typeId', required: false, description: 'Kasb turi (SkillType) ID si' })
  @ApiQuery({ name: 'status', required: false, enum: SkillStatus })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('typeId') typeId?: string,
    @Query('status') status?: SkillStatus,
  ) {
    return this.skillsService.getAll({
      page: +page, limit: +limit, id: id ? +id : undefined, search,
      typeId: typeId ? +typeId : undefined, status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta skill' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.skillsService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Skill yaratish' })
  create(@Body() dto: { name: string; typeId: number; status?: SkillStatus }) {
    return this.skillsService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Skillni yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.skillsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Skillni o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.skillsService.delete(id);
  }
}
