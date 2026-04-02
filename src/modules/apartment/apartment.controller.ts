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
import { ApartmentService } from './apartment.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@ApiTags('Apartments')
@Controller('apartments')
export class ApartmentController {
  constructor(private readonly apartmentService: ApartmentService) {}

  @Get()
  @ApiOperation({ summary: 'Apartmentlar ro‘yxati' })
  getAll() {
    return this.apartmentService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta apartment' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment yaratish' })
  create(@UserData() user: JwtPayload, @Body() dto: CreateApartmentDto) {
    return this.apartmentService.create(user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateApartmentDto,
  ) {
    return this.apartmentService.update(id, user, dto);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment statusini o‘zgartirish' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateApartmentStatusDto,
  ) {
    return this.apartmentService.updateStatus(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment o‘chirish' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
  ) {
    return this.apartmentService.delete(id, user);
  }
}
