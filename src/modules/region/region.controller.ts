import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionService } from './region.service';
import { ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

@Controller('region')
export class RegionController {
    constructor(private readonly service: RegionService) { }

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

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Post()
    create(@Body() payload: CreateRegionDto) {
        return this.service.create(payload);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateRegionDto,
    ) {
        return this.service.update(id, payload);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
