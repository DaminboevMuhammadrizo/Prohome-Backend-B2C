import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CacheResource, HttpCacheInterceptor } from 'src/common/cache/http-cache.interceptor';
import { B2bService } from './b2b.service';
import { SetB2bCompanyStatusDto } from './dto/b2b.dto';

@ApiTags('B2B Data')
@UseInterceptors(HttpCacheInterceptor)
@CacheResource('b2b', 600)
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  // ── Public — oddiy foydalanuvchi (yashirilgan kompaniyalar chiqarilmaydi) ──

  @Get('projects')
  @ApiOperation({
    summary: 'B2B loyihalar — faqat KO\'RINADIGAN kompaniyalarniki',
    description:
      'Admin `/b2b/admin/companies/:id/status` orqali `isActive: false` qilgan kompaniyaning loyihalari bu ro\'yxatda chiqmaydi.',
  })
  getProjects() {
    return this.b2bService.getProjects();
  }

  @Get('rooms')
  @ApiOperation({ summary: 'B2B xonalar (yashirilgan kompaniyalarniki chiqarilmaydi)' })
  getRooms(@Query() query: Record<string, any>) {
    return this.b2bService.getRooms(query);
  }

  @Get('room-detail')
  @ApiOperation({ summary: 'B2B xona detallari — yashirilgan kompaniya xonasi bo\'lsa 404' })
  @ApiQuery({ name: 'id', required: false })
  @ApiQuery({ name: 'roomNumber', required: false })
  getRoomDetail(@Query('id') id?: string, @Query('roomNumber') roomNumber?: string) {
    return this.b2bService.getRoomDetail(id ? +id : undefined, roomNumber);
  }

  // ── Admin (ADMIN/SUPERADMIN) — hammasini ko'radi va statusni boshqaradi ──

  @Get('admin/companies')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'BARCHA B2B kompaniyalar + ko\'rinish holati (isActive)',
    description:
      'Har bir kompaniyada `isActive` (overlay bo\'lmasa true) va `visibilityOverridden` (admin qo\'lda o\'zgartirganmi) qaytadi.',
  })
  adminCompanies() {
    return this.b2bService.adminListCompanies();
  }

  @Get('admin/projects')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'BARCHA B2B loyihalar (yashirilganlari ham) + `companyName`, `companyActive`',
    description: 'Admin shu ro\'yxatdan turib kompaniya statusini o\'zgartiradi.',
  })
  adminProjects() {
    return this.b2bService.adminListProjects();
  }

  @Patch('admin/companies/:companyId/status')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({
    summary: 'B2B kompaniyani ko\'rsatish / yashirish',
    description:
      '`companyId` — bu tashqi B2B backenddagi kompaniya id\'si (GET /b2b/admin/companies dagi `id`). ' +
      '`isActive: false` bo\'lganda o\'sha kompaniyaning barcha loyihalari/xonalari GET /b2b/projects, /rooms, /room-detail da oddiy foydalanuvchiga chiqmaydi.',
  })
  adminSetStatus(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: SetB2bCompanyStatusDto,
  ) {
    return this.b2bService.adminSetCompanyStatus(companyId, dto.isActive);
  }
}
