import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { fileStorages } from 'src/common/types/upload_types';
import { CompanyService } from './company.service';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
    constructor(private readonly companyService: CompanyService) { }

    @Get()
    @ApiOperation({ summary: 'Companylar ro‘yxati' })
    getAll(@Query() query: CompanyQueryDto) {
        return this.companyService.getAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Bitta company va analytics' })
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.getOne(id);
    }

    @Post(':id/view')
    @ApiOperation({ summary: 'Company view yozuvi qo‘shish' })
    addView(@Param('id', ParseIntPipe) id: number) {
        return this.companyService.addView(id);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @UseInterceptors(FileInterceptor('logo', fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['name', 'phone', 'password', 'logo'],
            properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                password: { type: 'string' },
                logo: { type: 'string', format: 'binary' },
                description: { type: 'string' },
                website: { type: 'string' },
                isVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @ApiOperation({ summary: 'Company qoshish' })
    create(@Body() dto: CreateCompanyDto, @UploadedFile() logo?: Express.Multer.File) {
        return this.companyService.create(dto, logo);
    }

    @Patch(':id')
    @ApiBearerAuth()
    @UseGuards(GuardService)
    @UseInterceptors(FileInterceptor('logo', fileStorages(['image'])))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                password: { type: 'string' },
                logo: { type: 'string', format: 'binary' },
                description: { type: 'string' },
                website: { type: 'string' },
                isVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
            },
        },
    })
    @ApiOperation({ summary: 'Company yangilash' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: UpdateCompanyDto,
        @UploadedFile() logo?: Express.Multer.File,
    ) {
        return this.companyService.update(id, user, dto, logo);
    }

    @Patch(':id/status')
    @ApiBearerAuth()
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SUPERADMIN)
    @ApiOperation({ summary: 'Company faol/nofoal qilish' })
    setActiveStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCompanyStatusDto,
    ) {
        return this.companyService.setActiveStatus(id, dto.isActive);
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
