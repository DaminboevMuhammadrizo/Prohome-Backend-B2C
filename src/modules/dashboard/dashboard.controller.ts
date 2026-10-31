import {
    Controller,
    Get,
    Query,
    Delete,
    Post,
    Body,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CreateDraftDto } from './dto/dashboard.dto';
import { GuardService } from 'src/common/guard/guard.service';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';

@ApiTags('Dashboard')
@Controller()
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly jwtService: JwtService,
    ) {}

    private extractUserId(req: any): number | undefined {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return undefined;
            const payload = this.jwtService.decode(token) as JwtPayload | null;
            return payload?.id ?? undefined;
        } catch {
            return undefined;
        }
    }

    // ─── HOME ──────────────────────────────────────────────────────────────

    @Get('home/stats')
    @ApiOperation({ summary: 'Bosh sahifa statistikasi (foydalanuvchilar, e\'lonlar, ustalar, ishlar)' })
    getHomeStats() {
        return this.dashboardService.getHomeStats();
    }

    @Get('home/categories')
    @ApiOperation({ summary: 'Kategoriyalar bo\'yicha e\'lonlar soni' })
    getHomeCategories() {
        return this.dashboardService.getHomeCategories();
    }

  



    @Get('real-estate/stats')
    @ApiOperation({ summary: 'Ko\'chmas mulk statistikasi (sotish/ijara, turlari, ko\'rishlar)' })
    getRealEstateStats() {
        return this.dashboardService.getRealEstateStats();
    }

    // ─── SEARCH ────────────────────────────────────────────────────────────

    @Get('search/suggestions')
    @ApiOperation({ summary: 'Qidiruv avtoto\'ldirish takliflari' })
    @ApiQuery({ name: 'q', required: true, type: String, description: 'Qidiruv so\'zi (min 2 ta belgi)' })
    getSearchSuggestions(@Query('q') q: string) {
        return this.dashboardService.getSearchSuggestions(q);
    }

    // ─── RECOMMENDATIONS ───────────────────────────────────────────────────

    @Get('recommendations')
    @ApiOperation({ summary: 'Tavsiya etilgan e\'lonlar, ustalar va ishlar' })
    getRecommendations() {
        return this.dashboardService.getRecommendations();
    }

    @Get('for-you')
    @ApiOperation({
        summary: 'Shaxsiylashtirilgan tavsiyalar (token ixtiyoriy)',
        description: 'Token berilsa — foydalanuvchining yoqtirganlari/qidiruv obunalari/joylashuviga qarab moslashtirilgan natija. Token bo\'lmasa yoki signal topilmasa — umumiy `/recommendations` natijasi (hech qachon bo\'sh qaytmaydi).',
    })
    getForYou(@Req() req: any) {
        return this.dashboardService.getPersonalRecommendations(this.extractUserId(req));
    }

    // ─── PLATFORM OVERVIEW ─────────────────────────────────────────────────

    @Get('platform/overview')
    @ApiOperation({ summary: 'Platforma to\'liq statistikasi (admin uchun)' })
    getPlatformOverview() {
        return this.dashboardService.getPlatformOverview();
    }

    // ─── FAVORITES ─────────────────────────────────────────────────────────

    @Get('favorites')
    @UseGuards(GuardService)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Foydalanuvchi sevimli e\'lonlari va ustalar' })
    getFavorites(@Req() req) {
        return this.dashboardService.getFavorites(req.user.id);
    }

    // ─── DRAFTS ────────────────────────────────────────────────────────────

    @Get('drafts')
    @UseGuards(GuardService)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Foydalanuvchi qoralamalar ro\'yxati' })
    getDrafts(@Req() req) {
        return this.dashboardService.getDrafts(req.user.id);
    }

    @Post('drafts')
    @UseGuards(GuardService)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Qoralama yaratish' })
    createDraft(@Req() req, @Body() dto: CreateDraftDto) {
        return this.dashboardService.createDraft(req.user.id, dto);
    }

    @Delete('drafts/:id')
    @UseGuards(GuardService)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Qoralamani o\'chirish' })
    deleteDraft(@Req() req, @Param('id') id: string) {
        return this.dashboardService.deleteDraft(req.user.id, +id);
    }
}
