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
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CreateDraftDto } from './dto/dashboard.dto';
import { GuardService } from 'src/common/guard/guard.service';

@ApiTags('Dashboard')
@Controller()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

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

  


    // ─── MASTERS ───────────────────────────────────────────────────────────

    @Get('masters/stats')
    @ApiOperation({ summary: 'Ustalar umumiy statistikasi' })
    getMastersStats() {
        return this.dashboardService.getMastersStats();
    }

    @Get('masters/top')
    @ApiOperation({ summary: 'Eng yaxshi ustalar (like va reyting bo\'yicha)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nechta qaytarish (default: 10)' })
    getTopMasters(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
        return this.dashboardService.getTopMasters(limit);
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

    // ─── PLATFORM OVERVIEW ─────────────────────────────────────────────────

    @Get('platform/overview')
    @ApiOperation({ summary: 'Platforma to\'liq statistikasi (admin uchun)' })
    getPlatformOverview() {
        return this.dashboardService.getPlatformOverview();
    }

    // ─── TOP LOCATIONS ─────────────────────────────────────────────────────

    @Get('locations/top')
    @ApiOperation({ summary: 'Eng ko\'p e\'lonli shaharlar' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nechta qaytarish (default: 10)' })
    getTopLocations(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
        return this.dashboardService.getTopLocations(limit);
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
