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
  @ApiOperation({
    summary: 'Foydalanuvchilar ro\'yxati (jadval uchun — har ustun bo\'yicha filtr)',
    description: 'Barcha parametrlar ixtiyoriy va bir-biri bilan birga ishlaydi (AND). Javob: `{ data: User[], meta: {page, limit, total, totalPages} }`.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Sahifa raqami', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Bir sahifadagi son', example: 20 })
  @ApiQuery({ name: 'id', required: false, description: 'Aniq foydalanuvchi ID si', example: 5 })
  @ApiQuery({ name: 'search', required: false, description: 'phone, email, ism yoki familiya bo\'yicha bitta umumiy qidiruv (qisman mos kelish, katta-kichik harf farqsiz)', example: '+99890' })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus, description: 'Foydalanuvchi holati' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Rol bo\'yicha filtr — berilmasa faqat oddiy (USER) foydalanuvchilar qaytadi' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Foydalanuvchi joylashuvi (shahar/viloyat) ID si — /locations dan olinadi' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Ro\'yxatdan o\'tgan sana — shundan boshlab', example: '2026-01-01' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Ro\'yxatdan o\'tgan sana — shungacha', example: '2026-12-31' })
  getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('id') id?: string,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
    @Query('role') role?: UserRole,
    @Query('locationId') locationId?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.userService.getAll({
      page: +page, limit: +limit, search, status, role,
      id: id ? +id : undefined,
      locationId: locationId ? +locationId : undefined,
      createdFrom, createdTo,
    });
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
