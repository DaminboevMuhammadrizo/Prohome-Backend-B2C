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
import { ComplexService } from './complex.service';
import { CreateComplexDto } from './dto/create-complex.dto';
import { UpdateComplexDto } from './dto/update-complex.dto';

@ApiTags('Complexes')
@Controller('complexes')
export class ComplexController {
  constructor(private readonly complexService: ComplexService) {}

  @Get()
  @ApiOperation({ summary: 'Complexlar ro‘yxati' })
  getAll() {
    return this.complexService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta complex' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.complexService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Complex yaratish' })
  create(@UserData() user: JwtPayload, @Body() dto: CreateComplexDto) {
    return this.complexService.create(user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Complex yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateComplexDto,
  ) {
    return this.complexService.update(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Complex o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.complexService.delete(id, user);
  }
}
