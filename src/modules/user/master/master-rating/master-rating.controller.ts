import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { MasterRatingService } from './master-rating.service';
import { CreateMasterRatingDto } from './dto/create.master-rating.dto';
import { UpdateMasterRatingDto } from './dto/update.master-rating.dto';
import { PaginationDto } from '../../dto/pagination.dto';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserData } from 'src/common/decorators/auth.decorators';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';

@ApiTags('Master Ratings')
@ApiBearerAuth()
@Controller('master-ratings')
export class MasterRatingController {
  constructor(private readonly masterRatingService: MasterRatingService) {}


  @Get('all')
  @ApiOperation({ summary: '' })
  findAll(@Query() pagination: PaginationDto) {
    return this.masterRatingService.getAllRating(pagination);
  }

  @Get('my-ratings')
  @ApiOperation({ summary: '' })
  findMyRatings(@UserData() user: JwtPayload, @Query() pagination: PaginationDto) {
    const userId = user.id;
    return this.masterRatingService.getMyRatings(userId, pagination);
  }

  @Get('my-rating/:id')
  @ApiOperation({ summary: '' })
  findMyOneRating(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    const userId = user.id;
    return this.masterRatingService.getMyOneRating(id, userId);
  }

  @Get('by-master/:masterProfileId')
  @ApiOperation({ summary: '' })
  findByMaster(
    @Param('masterProfileId', ParseIntPipe) masterProfileId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.masterRatingService.getByMaster(masterProfileId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: '' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterRatingService.getOneRating(id);
  }


  @Post('create')
  @ApiOperation({ summary: '' })
  create(@UserData() user: JwtPayload, @Body() createMasterRatingDto: CreateMasterRatingDto) {
    const userId = user.id;
    return this.masterRatingService.create(userId, createMasterRatingDto);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: '' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() updateMasterRatingDto: UpdateMasterRatingDto,
  ) {
    const userId = user.id;
    return this.masterRatingService.update(id, userId, updateMasterRatingDto);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '' })
  remove(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    const userId = user.id;
    return this.masterRatingService.remove(id, userId);
  }
}