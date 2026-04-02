import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingService } from './rating.service';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Get()
  @ApiOperation({ summary: 'Ratinglar ro‘yxati' })
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

  @Get('master/:masterProfileId')
  @ApiOperation({ summary: 'Master bo‘yicha ratinglar' })
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
  @ApiOperation({ summary: 'Rating o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.ratingService.delete(id, user);
  }
}
