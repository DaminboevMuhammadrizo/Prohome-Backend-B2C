import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { B2bService } from './b2b.service';

@ApiTags('B2B Data')
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Get('projects')
  @ApiOperation({ summary: "B2B backenddan barcha projectlar (AI chiqarilgan 3 ta)" })
  getProjects() {
    return this.b2bService.getProjects();
  }

  @Get('rooms')
  @ApiOperation({ summary: 'B2B backenddan xonalar (filtrlash bilan)' })
  getRooms(@Query() query: Record<string, any>) {
    return this.b2bService.getRooms(query);
  }

  @Get('room-detail')
  @ApiOperation({ summary: 'B2B backenddan xona detallari (ID yoki xona raqami bilan)' })
  @ApiQuery({ name: 'id', required: false })
  @ApiQuery({ name: 'roomNumber', required: false })
  getRoomDetail(@Query('id') id?: string, @Query('roomNumber') roomNumber?: string) {
    return this.b2bService.getRoomDetail(id ? +id : undefined, roomNumber);
  }
}
