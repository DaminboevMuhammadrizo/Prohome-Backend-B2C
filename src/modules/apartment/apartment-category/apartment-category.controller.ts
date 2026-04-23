import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { ApartmentCategoryService } from './apartment-category.service';
import { CreateApartmentCategoryDto } from './dto/create-apartment-category.dto';
import { UpdateApartmentCategoryDto } from './dto/update-apartment-category.dto';
import { UpdateApartmentCategoryStatusDto } from './dto/update-apartment-category-status.dto';

@ApiTags('Apartment Categories')
@Controller('apartment-categories')
export class ApartmentCategoryController {
    constructor(
        private readonly apartmentCategoryService: ApartmentCategoryService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Apartment kategoriyalar ro‘yxati' })
    getAll() {
        return this.apartmentCategoryService.getAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta apartment kategoriya' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentCategoryService.getOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya yaratish' })
    create(@Body() dto: CreateApartmentCategoryDto) {
        return this.apartmentCategoryService.create(dto);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateApartmentCategoryDto,
    ) {
        return this.apartmentCategoryService.update(id, dto);
    }

    @Patch(':id/archive')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya arxivlash' })
    archive(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentCategoryService.archive(id);
    }

    @Patch(':id/unarchive')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya arxivdan chiqarish' })
    unarchive(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentCategoryService.unarchive(id);
    }

    @Patch(':id/status')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya active statusini yangilash' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateApartmentCategoryStatusDto,
    ) {
        return this.apartmentCategoryService.updateStatus(id, dto);
    }

    @Patch(':id/status-toggle')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya status toggle' })
    toggleStatus(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentCategoryService.toggleStatus(id);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Apartment kategoriya o‘chirish' })
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.apartmentCategoryService.delete(id);
    }
}
