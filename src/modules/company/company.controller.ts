import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CompanyService } from './company.service';
import { ContentLimitDto, CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@ApiTags('Company Management')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ── Statik route'lar — /:id dan OLDIN ──────────────────────────────────

  @Get('b2b')
  @ApiOperation({ summary: "B2B backendagi barcha kompaniyalar — qaysi biri B2C ga qo'shilganini ham ko'rsatadi (addedToB2c: true/false)" })
  getB2bCompanies() {
    return this.companyService.getB2bCompanies();
  }

  @Get('content-limit')
  @ApiOperation({ summary: "Global default content limiti (yangi kompaniya qo'shilganda ishlatiladi)" })
  getContentLimit() {
    return this.companyService.getContentLimit();
  }

  @Patch('content-limit')
  @ApiOperation({ summary: 'Global default limitni yangilash — bu yangi kompaniyalar uchun default (mavjudlarga ta\'sir qilmaydi)' })
  updateContentLimit(@Body() dto: ContentLimitDto) {
    return this.companyService.updateContentLimit(dto);
  }

  @Get()
  @ApiOperation({ summary: "B2C ga qo'shilgan kompaniyalar ro'yxati" })
  getAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.companyService.getAll(+page, +limit);
  }

  @Post()
  @ApiOperation({ summary: "B2B kompaniyasini B2C ga qo'shish — parol admin tomonidan o'rnatiladi" })
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  // ── Parametrli route'lar ────────────────────────────────────────────────

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Kompaniyani faollashtirish / bloklash' })
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.toggleActive(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Kompaniya ma'lumotlarini yangilash (nom, logo, parol, limitlar)" })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Kompaniyani B2C dan o'chirish" })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.delete(id);
  }
}
