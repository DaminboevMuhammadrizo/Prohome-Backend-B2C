import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('suggestions')
  @ApiOperation({ summary: 'Qidiruv autocompletelari — ustalar, e\'lonlar, ishlar, skilllar' })
  @ApiQuery({ name: 'q', required: true, description: 'Kamida 2 ta belgi' })
  getSuggestions(@Query('q') q = '') {
    return this.searchService.getSuggestions(q);
  }
}
