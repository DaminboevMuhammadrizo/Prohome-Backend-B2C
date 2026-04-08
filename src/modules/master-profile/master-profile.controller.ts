import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { CreateMasterProfileDto } from './dto/create-master-profile.dto';
import { MasterProfileQueryDto } from './dto/master-profile-query.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';
import { MasterProfileService } from './master-profile.service';

@ApiTags('Master Profiles')
@Controller('master-profiles')
export class MasterProfileController {
    constructor(private readonly masterProfileService: MasterProfileService) { }

    @Get()
    @ApiOperation({ summary: 'Master profillar ro‘yxati' })
    getAll(@Query() query: MasterProfileQueryDto) {
        return this.masterProfileService.getAll(query);
    }

    @Get('me')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Mening master profilim' })
    getMyProfile(@UserData() user: JwtPayload) {
        return this.masterProfileService.getMyProfile(user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta master profil' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.masterProfileService.getOne(id);
    }

    @Get(':id/interaction')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Current user uchun master interaction statusi' })
    getInteractionState(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
    ) {
        return this.masterProfileService.getInteractionState(id, user);
    }

    @Get(':id/viewers')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Admin uchun master viewerlar ro‘yxati' })
    getViewers(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Query() pagination: PaginationDto,
    ) {
        return this.masterProfileService.getViewers(id, user, pagination);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Master profil yaratish' })
    create(@UserData() user: JwtPayload, @Body() dto: CreateMasterProfileDto) {
        return this.masterProfileService.create(user, dto);
    }

    @Post(':id/save')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Ustani saqlash yoki unsave qilish' })
    toggleSave(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.masterProfileService.toggleSave(id, user);
    }

    @Post(':id/view')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Master profile view yozuvi qo‘shish' })
    addView(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.masterProfileService.addView(id, user);
    }

    @Post(':id/contact')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Usta bilan bog‘lanish bosilganini saqlash' })
    markContact(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
        return this.masterProfileService.markContact(id, user);
    }

    @Patch()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Master profilni yangilash' })
    update(@UserData() user: JwtPayload, @Body() dto: UpdateMasterProfileDto) {
        return this.masterProfileService.update(user, dto);
    }

    @Delete()
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @ApiOperation({ summary: 'Master profilni o‘chirish' })
    delete(@UserData() user: JwtPayload) {
        return this.masterProfileService.delete(user);
    }
}
