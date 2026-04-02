import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { ApartmentLayoutService } from './apartment-layout.service';
import { CreateApartmentLayoutDto } from './dto/create-apartment-layout.dto';
import { UpdateApartmentLayoutDto } from './dto/update-apartment-layout.dto';

@ApiTags('Apartment Layouts')
@Controller('apartment-layouts')
export class ApartmentLayoutController {
  constructor(private readonly apartmentLayoutService: ApartmentLayoutService) {}

  @Get()
  @ApiOperation({ summary: 'Apartment layoutlar ro‘yxati' })
  getAll() {
    return this.apartmentLayoutService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta apartment layout' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentLayoutService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment layout yaratish' })
  create(@UserData() user: JwtPayload, @Body() dto: CreateApartmentLayoutDto) {
    return this.apartmentLayoutService.create(user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment layout yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateApartmentLayoutDto,
  ) {
    return this.apartmentLayoutService.update(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment layout o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.apartmentLayoutService.delete(id, user);
  }
}
