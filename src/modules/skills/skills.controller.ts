import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { SkillStatus, UserRole } from '@prisma/client';
import { SkillsService } from './skills.service';

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Skilllar ro\'yxati' })
  getAll(@Query('typeId') typeId?: string, @Query('status') status?: SkillStatus) {
    return this.skillsService.getAll(typeId ? +typeId : undefined, status);
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
