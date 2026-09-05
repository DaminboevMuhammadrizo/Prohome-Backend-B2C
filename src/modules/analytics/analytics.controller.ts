import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { AnalyticsService } from './analytics.service';

// Faqat admin uchun — chuqur statistika/analitika paneli.
// Har bir jadval (users/masters/real-estates/jobs/search-misses/notifications)
// alohida endpointda, o'zining geografik (davlat/O'zbekiston ichida viloyat)
// kesimi bilan.
@ApiTags('Analytics (Admin)')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: "Umumiy ko'rinish — barcha jadvallar bo'yicha asosiy sonlar" })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: "Foydalanuvchilar: geografiya (davlat/viloyat), rol, status, ro'yxatdan o'tish trendi" })
  getUsers() {
    return this.analyticsService.getUsersAnalytics();
  }

  @Get('masters')
  @ApiOperation({ summary: 'Ustalar: geografiya, kasb turlari kesimi, band/bo\'sh, reyting' })
  getMasters() {
    return this.analyticsService.getMastersAnalytics();
  }

  @Get('real-estates')
  @ApiOperation({ summary: "Ko'chmas mulklar: geografiya, turlar, narx statistikasi, ko'rishlar, trend" })
  getRealEstates() {
    return this.analyticsService.getRealEstatesAnalytics();
  }

  @Get('jobs')
  @ApiOperation({ summary: "Ish e'lonlari: geografiya, kasb turlari, status, ko'rishlar, trend" })
  getJobs() {
    return this.analyticsService.getJobsAnalytics();
  }

  @Get('search-misses')
  @ApiOperation({ summary: "Topilmagan qidiruvlar: turi, geografiya, eng ko'p qidirilgan kriteriyalar, trend" })
  getSearchMisses() {
    return this.analyticsService.getSearchMissesAnalytics();
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Bildirishnomalar: status/kategoriya kesimi, yetkazish foizi' })
  getNotifications() {
    return this.analyticsService.getNotificationsAnalytics();
  }
}
