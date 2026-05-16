import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateSkillTypeDto, SkillTypeService } from './skill-type.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { SkillStatus, UserRole } from '@prisma/client';

@ApiTags('Skill Types')
@Controller('skill-types')
export class SkillTypeController {
  constructor(private readonly skillTypeService: SkillTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Skill turlari ro\'yxati' })
  getAll(@Query('status') status?: SkillStatus) {
    return this.skillTypeService.getAll(status);
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
