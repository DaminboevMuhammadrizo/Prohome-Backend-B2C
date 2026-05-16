import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GuardService } from 'src/common/guard/guard.service';
import { SocialService } from './social.service';
import { SocialPlatform } from '@prisma/client';

@ApiTags('Socials')
@Controller('socials')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Usta ijtimoiy havolalari' })
  getByMaster(@Param('masterId', ParseIntPipe) masterId: number) {
    return this.socialService.getByMaster(masterId);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Post('master/:masterId')
  @ApiOperation({ summary: 'Ijtimoiy havola qo\'shish' })
  create(@Param('masterId', ParseIntPipe) masterId: number, @Body() dto: { platform: SocialPlatform; url: string }) {
    return this.socialService.create(masterId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Patch(':id/master/:masterId')
  @ApiOperation({ summary: 'Ijtimoiy havolani yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Param('masterId', ParseIntPipe) masterId: number,
    @Body() dto: { platform?: SocialPlatform; url?: string },
  ) {
    return this.socialService.update(id, masterId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Delete(':id/master/:masterId')
  @ApiOperation({ summary: 'Ijtimoiy havolani o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @Param('masterId', ParseIntPipe) masterId: number) {
    return this.socialService.delete(id, masterId);
  }
}
