import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { LocationType, UserRole } from '@prisma/client';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { LocationService } from './location.service';

@ApiTags('Locations')
@UseInterceptors(HttpCacheInterceptor)
@CacheResource('loc')
@Controller('locations')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Joylashuvlar ro\'yxati (davlat/viloyat/shahar)',
    description:
      'Daraxt shaklidagi joylashuvni tekis (flat) ro\'yxat sifatida qaytaradi. Bitta darajani olish uchun `type` + `parentId` ' +
      'birga beriladi (masalan bitta viloyatning shaharlari: `type=CITY&parentId=<viloyat_id>`). To\'liq daraxt uchun `/locations/tree` ishlating. ' +
      'Diqqat: javob endi `{ data: Location[], meta: {...} }` ko\'rinishida.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son (default 200 — odatda bitta so\'rovda yetadi)', example: 200 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq joylashuv ID si' })
  @ApiQuery({ name: 'type', required: false, enum: LocationType, description: 'COUNTRY / REGION / CITY' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Ota joylashuv ID si (masalan viloyat ID si — uning shaharlarini olish uchun). 0 — ota-joylashuvsizlar (davlatlar)' })
  @ApiQuery({ name: 'search', required: false, description: 'Nomi bo\'yicha qidiruv' })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 200,
    @Query('id') id?: string,
    @Query('type') type?: LocationType,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    return this.locationService.getAll({
      page: +page, limit: +limit,
      id: id ? +id : undefined,
      type,
      parentId: parentId !== undefined ? +parentId : undefined,
      search,
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Joylashuvlar daraxti (Country→Region→City)' })
  getTree() {
    return this.locationService.getTree();
  }

  @Get('top')
  @ApiOperation({ summary: 'Eng ko\'p e\'lonli shaharlar' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopLocations(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.dashboardService.getTopLocations(limit);
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
