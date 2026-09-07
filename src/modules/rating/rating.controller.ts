import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { RatingService } from './rating.service';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('admin/all')
  @ApiOperation({
    summary: 'Barcha reytinglar (admin, jadval uchun)',
    description: 'Javob: `{ data: Rating[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 20 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq reyting ID si' })
  @ApiQuery({ name: 'userId', required: false, description: 'Baho bergan foydalanuvchi ID si' })
  @ApiQuery({ name: 'masterId', required: false, description: 'Baholangan usta ID si' })
  @ApiQuery({ name: 'rating', required: false, description: 'Aniq ball (1-5)' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Ball — shundan boshlab (rating berilmasa ishlaydi)' })
  @ApiQuery({ name: 'maxRating', required: false, description: 'Ball — shungacha (rating berilmasa ishlaydi)' })
  @ApiQuery({ name: 'search', required: false, description: 'Izoh (comment) matni bo\'yicha qidiruv' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Sana — shungacha', example: '2026-12-31' })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('id') id?: string,
    @Query('userId') userId?: string,
    @Query('masterId') masterId?: string,
    @Query('rating') rating?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('search') search?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.ratingService.getAll({
      page: +page, limit: +limit,
      id: id ? +id : undefined,
      userId: userId ? +userId : undefined,
      masterId: masterId ? +masterId : undefined,
      rating: rating ? +rating : undefined,
      minRating: minRating ? +minRating : undefined,
      maxRating: maxRating ? +maxRating : undefined,
      search, createdFrom, createdTo,
    });
  }

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Usta reytinglari' })
  getByMaster(@Param('masterId', ParseIntPipe) masterId: number, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.ratingService.getByMaster(masterId, +page, +limit);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me')
  @ApiOperation({ summary: 'Mening reytinglarim' })
  getMyRatings(@UserData() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.ratingService.getMyRatings(user.id, +page, +limit);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post()
  @ApiOperation({ summary: 'Ustaga baho berish' })
  create(@UserData() user: JwtPayload, @Body() dto: { masterId: number; rating: number; comment?: string }) {
    return this.ratingService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Patch(':id')
  @ApiOperation({ summary: 'Reytingni yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload, @Body() dto: { rating?: number; comment?: string }) {
    return this.ratingService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Delete(':id')
  @ApiOperation({ summary: 'Reytingni o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    return this.ratingService.delete(id, user.id, isAdmin);
  }
}
