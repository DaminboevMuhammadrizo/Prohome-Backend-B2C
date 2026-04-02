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
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Companylar ro‘yxati' })
  getAll() {
    return this.companyService.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta company' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Company qo‘shish' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Company yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Company o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.delete(id);
  }
}
