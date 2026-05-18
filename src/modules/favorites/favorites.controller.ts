import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get()
  @ApiOperation({ summary: 'Saqlangan (like qilingan) ustalar va ish e\'lonlari' })
  getAll(@UserData() user: JwtPayload) {
    return this.favoritesService.getAll(user.id);
  }
}
