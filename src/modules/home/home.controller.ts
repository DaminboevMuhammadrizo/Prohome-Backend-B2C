import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeService } from './home.service';

@ApiTags('Home')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Bosh sahifa umumiy statistikasi: foydalanuvchilar, ustalar, e\'lonlar, ishlar' })
  getStats() {
    return this.homeService.getStats();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Bosh sahifa kategoriyalar va ularning soni' })
  getCategories() {
    return this.homeService.getCategories();
  }
}
