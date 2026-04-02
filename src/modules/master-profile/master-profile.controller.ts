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
import { CreateMasterProfileDto } from './dto/create-master-profile.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';
import { MasterProfileService } from './master-profile.service';

@ApiTags('Master Profiles')
@Controller('master-profiles')
export class MasterProfileController {
  constructor(private readonly masterProfileService: MasterProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Master profillar ro‘yxati' })
  getAll(@Query() pagination: PaginationDto) {
    return this.masterProfileService.getAll(pagination);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Mening master profilim' })
  getMyProfile(@UserData() user: JwtPayload) {
    return this.masterProfileService.getMyProfile(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta master profil' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterProfileService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Master profil yaratish' })
  create(@UserData() user: JwtPayload, @Body() dto: CreateMasterProfileDto) {
    return this.masterProfileService.create(user, dto);
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Master profilni yangilash' })
  update(@UserData() user: JwtPayload, @Body() dto: UpdateMasterProfileDto) {
    return this.masterProfileService.update(user, dto);
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Master profilni o‘chirish' })
  delete(@UserData() user: JwtPayload) {
    return this.masterProfileService.delete(user);
  }
}
