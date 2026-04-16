import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ModerateRatingDto } from './dto/moderate-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingService } from './rating.service';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
    constructor(private readonly ratingService: RatingService) { }

    @Get()
    @ApiOperation({ summary: 'Ratinglar royxati' })
    getAll(@Query() pagination: PaginationDto) {
        return this.ratingService.getAll(pagination);
    }

    @Get('me')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Mening ratinglarim' })
    getMyRatings(@UserData() user: JwtPayload, @Query() pagination: PaginationDto) {
        return this.ratingService.getMyRatings(user, pagination);
    }

    @Get('pending/moderation')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Moderatsiya kutayotgan ratinglar' })
    getPendingRatings(@UserData() user: JwtPayload, @Query() pagination: PaginationDto) {
        return this.ratingService.getPendingRatings(user, pagination);
    }

    @Get('master/:masterProfileId')
    @ApiOperation({ summary: 'Master boyicha ratinglar' })
    getByMaster(
        @Param('masterProfileId', ParseIntPipe) masterProfileId: number,
        @Query() pagination: PaginationDto,
    ) {
        return this.ratingService.getByMaster(masterProfileId, pagination);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta rating' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.ratingService.getOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Rating yaratish' })
    create(@UserData() user: JwtPayload, @Body() dto: CreateRatingDto) {
        return this.ratingService.create(user, dto);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Rating yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: UpdateRatingDto,
    ) {
        return this.ratingService.update(id, user, dto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Rating ochirish' })
    delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.ratingService.delete(id, user);
    }

    @Patch(':id/moderate')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Ratingni approve yoki reject qilish' })
    moderate(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: ModerateRatingDto,
    ) {
        return this.ratingService.moderate(id, user, dto);
    }
}
