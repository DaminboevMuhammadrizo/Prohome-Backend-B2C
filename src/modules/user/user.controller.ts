import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { ChangeUserStatusDto } from './dto/user-action.dto';
import { Role } from 'src/common/decorators/role.decorator';
import { CreateUserDto } from './dto/create.user.dto';
import { UserRole, UserStatus } from '@prisma/client';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi profili' })
  getMe(@UserData() user: JwtPayload) {
    return this.userService.getMe(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Patch('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchi profilini yangilash' })
  updateMe(@UserData() user: JwtPayload, @Body() dto: UpdateUserMeDto) {
    return this.userService.updateMe(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Foydalanuvchi yaratish (admin)' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  @ApiOperation({ summary: 'Foydalanuvchilar ro\'yxati' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus
  ) {
    return this.userService.getAll(+page, +limit, search, status);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Bitta foydalanuvchi' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getById(id);
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
  @Patch(':id/status')
  @ApiOperation({ summary: 'Foydalanuvchi statusini o\'zgartirish (ACTIVE/BLOCKED/ARCHIVED)' })
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeUserStatusDto) {
    return this.userService.changeStatus(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Foydalanuvchini o\'chirish' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}
