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
import { MasterProfileService } from './master-profile.service';
import { CreateMasterProfileDto } from './dto/create.master.profile.dto';
import { UpdateMasterProfileDto } from './dto/update.master-profile.dto';
import { PaginationDto } from '../../dto/pagination.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserData } from 'src/common/decorators/auth.decorators';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';

@ApiTags('Master Profiles')
@ApiBearerAuth() 
@Controller('master-profiles')
export class MasterProfileController {
  constructor(private readonly masterProfileService: MasterProfileService) {}

  @Get('all')
  @ApiOperation({ summary: '' })
  findAll(@Query() pagination: PaginationDto) {
    return this.masterProfileService.findAll(pagination);
  }

  @Get(':userId')
  @ApiOperation({ summary: '' })
  findOne(@Param('userId', ParseIntPipe) userId: number) {
    return this.masterProfileService.getMyProfile(userId);
  }

  @Get('my-profile')
  @ApiOperation({ summary: '' })
  findMyProfile(@UserData() user: JwtPayload) {
    const userId = user.id;
    return this.masterProfileService.getMyProfile(userId);
  }

  @Post('create')
  @ApiOperation({ summary: '' })
  create(@UserData() user: JwtPayload, @Body() createMasterProfileDto: CreateMasterProfileDto) {
    const userId = user.id;
    return this.masterProfileService.create(userId, createMasterProfileDto);
  }

  @Patch('update')
  @ApiOperation({ summary: '' })
  update(
    @UserData() user: JwtPayload,
    @Body() updateMasterProfileDto: UpdateMasterProfileDto,
  ) {
    const userId = user.id;
    return this.masterProfileService.update(userId, updateMasterProfileDto);
  }

  @Delete('delete')
  @ApiOperation({ summary: '' })
  remove(@UserData() user: JwtPayload) {
    const userId = user.id;
    return this.masterProfileService.remove(userId);
  }

  
}