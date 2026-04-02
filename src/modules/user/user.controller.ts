import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserService } from './user.service';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi profili' })
  getMe(@UserData() user: JwtPayload) {
    return this.userService.getMe(user);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Patch('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi profilini yangilash' })
  updateMe(@UserData() user: JwtPayload, @Body() dto: UpdateUserMeDto) {
    return this.userService.updateMe(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  @ApiOperation({ summary: 'Foydalanuvchilar ro‘yxati' })
  getAll(@Query() pagination: PaginationDto) {
    return this.userService.getAll(pagination);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Bitta foydalanuvchini olish' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Foydalanuvchini yangilash' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Foydalanuvchini o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}
