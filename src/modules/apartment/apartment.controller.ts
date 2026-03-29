import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApartmentService } from './apartment.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { fileStorages } from 'src/common/types/upload_types';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';

@Controller('apartment')
export class ApartmentController {
    constructor(private readonly service: ApartmentService) { }

    @ApiOperation({ summary: `ALL` })
    @Get()
    getAll() {
        return this.service.getAll();
    }

    @ApiOperation({ summary: `ALL` })
    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.getOne(id);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.SELLER}` })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['img', 'addressUz', 'addressUzCyrl', 'addressRu', 'regionId', 'titleUz', 'titleUzCyrl', 'titleRu', 'area', 'pricePerMetr', 'apartmentTypeId', 'apartmentStatus'],
            properties: {
                img: { type: 'array', items: { type: 'string', format: 'binary' } },
                addressUz: { type: 'string' },
                addressUzCyrl: { type: 'string' },
                addressRu: { type: 'string' },
                regionId: { type: 'number' },
                roomCount: { type: 'number' },
                descUz: { type: 'string' },
                descUzCyrl: { type: 'string' },
                descRu: { type: 'string' },
                titleUz: { type: 'string' },
                titleUzCyrl: { type: 'string' },
                titleRu: { type: 'string' },
                area: { type: 'number' },
                pricePerMetr: { type: 'number' },
                price: { type: 'number' },
                apartmentTypeId: { type: 'number' },
                apartmentStatus: { type: 'string', enum: ['IJARA', 'SOTISH'] },
            },
        },
    })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SELLER)
    @Post()
    @UseInterceptors(FilesInterceptor('img', 10, fileStorages(['image'])))
    create(
        @Body() payload: CreateApartmentDto,
        @UserData() user: JwtPayload,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.service.create(payload, user.id, files.map((f) => f.filename));
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.SELLER}` })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                img: { type: 'array', items: { type: 'string', format: 'binary' } },
                addressUz: { type: 'string' },
                addressUzCyrl: { type: 'string' },
                addressRu: { type: 'string' },
                regionId: { type: 'number' },
                roomCount: { type: 'number' },
                descUz: { type: 'string' },
                descUzCyrl: { type: 'string' },
                descRu: { type: 'string' },
                titleUz: { type: 'string' },
                titleUzCyrl: { type: 'string' },
                titleRu: { type: 'string' },
                area: { type: 'number' },
                pricePerMetr: { type: 'number' },
                price: { type: 'number' },
                apartmentTypeId: { type: 'number' },
                apartmentStatus: { type: 'string', enum: ['IJARA', 'SOTISH'] },
            },
        },
    })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SELLER)
    @Patch(':id')
    @UseInterceptors(FilesInterceptor('img', 10, fileStorages(['image'])))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateApartmentDto,
        @UploadedFiles() files?: Express.Multer.File[],
    ) {
        return this.service.update(id, payload, files?.map((f) => f.filename));
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}, ${UserRole.SELLER}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN, UserRole.SELLER)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
