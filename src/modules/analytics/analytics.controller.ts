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
  @ApiOperation({
    summary: "Umumiy ko'rinish (dashboard uchun)",
    description:
      'Barcha jadvallar (users/masters/realEstates/jobs/companies/searchMisses/notifications) bo\'yicha ' +
      'asosiy sonlarni bitta so\'rovda qaytaradi — har biri `{ total, ... }` ko\'rinishida qisqa obyekt. ' +
      "Filtr yo'q, parametrsiz chaqiriladi.",
  })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('users')
  @ApiOperation({
    summary: "Foydalanuvchilar statistikasi",
    description:
      "Javobda: `byRole`/`byStatus` (enum→son), `geography.byCountry` — har bir davlat `{name, count, regions: [{name, count}]}` " +
      "ko'rinishida (front-end davlatni bosganda `regions`ni ochib ko'rsatadi), va `registrationTrend` — oxirgi 30 kunlik " +
      "`[{date: 'YYYY-MM-DD', count}]` massivi (grafik chizish uchun tayyor).",
  })
  getUsers() {
    return this.analyticsService.getUsersAnalytics();
  }

  @Get('masters')
  @ApiOperation({
    summary: 'Ustalar statistikasi',
    description:
      "`geography` (users bilan bir xil format), `bySkillType` — kasb turlari bo'yicha sonlar, " +
      "`free`/`busy`, `avgRating` — barcha ustalarning o'rtacha reytingi.",
  })
  getMasters() {
    return this.analyticsService.getMastersAnalytics();
  }

  @Get('real-estates')
  @ApiOperation({
    summary: "Ko'chmas mulklar statistikasi",
    description:
      "`geography`, `byPropertyType`/`byDealType`/`byStatus` (son bo'yicha kesim), `priceStats` — " +
      "har bir dealType (SALE/RENT) uchun `{avg, min, max}` narx, `listingTrend` — oxirgi 30 kunlik e'lon soni.",
  })
  getRealEstates() {
    return this.analyticsService.getRealEstatesAnalytics();
  }

  @Get('jobs')
  @ApiOperation({
    summary: "Ish e'lonlari statistikasi",
    description: "`geography`, `bySkillType`, `byStatus`, `totalViews`/`avgViews`, `listingTrend` (oxirgi 30 kun).",
  })
  getJobs() {
    return this.analyticsService.getJobsAnalytics();
  }

  @Get('search-misses')
  @ApiOperation({
    summary: "Topilmagan qidiruvlar statistikasi",
    description:
      "Foydalanuvchilar qidirib-topa olmagan so'rovlar bo'yicha: `byType` (REAL_ESTATE/JOB/MASTER), `geography`, " +
      "`topCriteriaByType` — har bir tur uchun eng ko'p qidirilgan (lekin topilmagan) kriteriya qiymatlari " +
      "(masalan `{field:'propertyType', value:'OFFICE', count:5}`), `unresolved` — hali hech kimga moslik topilib xabar berilmagan sonlar, `trend`.",
  })
  getSearchMisses() {
    return this.analyticsService.getSearchMissesAnalytics();
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'Bildirishnomalar statistikasi',
    description: "`byStatus` (PENDING/SENT/FAILED), `byCategory` (SEARCH_MATCH/ADMIN_BROADCAST/SYSTEM), `deliveryRate` — muvaffaqiyatli yuborilgan foizi (0-100).",
  })
  getNotifications() {
    return this.analyticsService.getNotificationsAnalytics();
  }
}
