import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { LocationType, UserRole } from '@prisma/client';
import { LocationService } from './location.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ApiOperation({ summary: 'Joylashuvlar ro\'yxati' })
  @ApiQuery({ name: 'type', required: false, enum: LocationType })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  getAll(
    @Query('type') type?: LocationType,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    return this.locationService.getAll(type, parentId !== undefined ? +parentId : undefined, search);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Joylashuvlar daraxti (Country→Region→City)' })
  getTree() {
    return this.locationService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta joylashuv' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.getById(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Joylashuv yaratish (admin)' })
  create(@Body() dto: CreateLocationDto) {
    return this.locationService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Joylashuvni yangilash (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto) {
    return this.locationService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Joylashuvni o\'chirish (admin)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.delete(id);
  }
}
