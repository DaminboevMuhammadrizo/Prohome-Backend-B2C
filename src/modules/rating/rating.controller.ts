import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { RatingService } from './rating.service';
import { UserRole } from '@prisma/client';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('admin/all')
  @ApiOperation({ summary: 'Barcha reytinglar (admin)' })
  getAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.ratingService.getAll(+page, +limit);
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
