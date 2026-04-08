import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { UpdateUserDto, UpdateUserMeDto } from './dto/updater.user.dto';
import { UserArchiveDto, UserBlockDto } from './dto/user-action.dto';
import { UserQueryDto } from './dto/user-query.dto';
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
    return this.userService.getMe(user);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me/favorite-apartments')
  @ApiOperation({ summary: 'Mening like qilgan apartmentlarim' })
  getFavoriteApartments(@UserData() user: JwtPayload) {
    return this.userService.getFavoriteApartments(user);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService)
  @Get('me/saved-masters')
  @ApiOperation({ summary: 'Mening saqlagan ustalarim' })
  getSavedMasters(@UserData() user: JwtPayload) {
    return this.userService.getSavedMasters(user);
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
  getAll(@Query() query: UserQueryDto) {
    return this.userService.getAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Bitta foydalanuvchini to‘liq olish' })
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
  @Patch(':id/block')
  @ApiOperation({ summary: 'Foydalanuvchini block yoki unblock qilish' })
  setBlockStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UserBlockDto,
  ) {
    return this.userService.setBlockStatus(id, dto.isBlocked);
  }

  @ApiBearerAuth()
  @UseGuards(GuardService, RoleGuardService)
  @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id/archive')
  @ApiOperation({ summary: 'Foydalanuvchini archive yoki unarchive qilish' })
  setArchiveStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UserArchiveDto,
  ) {
    return this.userService.setArchiveStatus(id, dto.isArchived);
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
