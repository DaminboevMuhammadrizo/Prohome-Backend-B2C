import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateMasterDto } from './dto/create-master.dto';
import { MasterQueryDto } from './dto/master-query.dto';
import { MasterStatusDto } from './dto/master-status.dto';
import { UpdateMasterDto } from './dto/update-master.dto';
import { MasterService } from './master.service';

@ApiTags('Admin / Masters')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('users/masters')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get()
  @ApiOperation({
    summary: 'Barcha ustalar ro\'yxati',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  getAll(@Query() query: MasterQueryDto) {
    return this.masterService.getAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Bitta ustani to\'liq ma\'lumoti',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.getOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Yangi usta yaratish — user + master profil',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  create(@Body() dto: CreateMasterDto) {
    return this.masterService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Ustani yangilash — user va master profil',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterDto,
  ) {
    return this.masterService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Usta statusini o\'zgartirish — isAvailable / isBlocked',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MasterStatusDto,
  ) {
    return this.masterService.toggleStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Ustani o\'chirish — user va master profil kaskad',
    description: '🔐 Ruxsat: ADMIN, SUPERADMIN',
  })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.delete(id);
  }
}
