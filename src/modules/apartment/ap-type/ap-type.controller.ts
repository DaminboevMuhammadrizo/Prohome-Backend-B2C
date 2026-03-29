import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { GuardService } from 'src/common/guard/guard.service';
import { Role } from 'src/common/decorators/role.decorator';
import { CreateApTypeDto } from './dto/create-ap-type.dto';
import { UpdateApTypeDto } from './dto/update-ap-type.dto';
import { ApTypeService } from './ap-type.service';
import { ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

@Controller('ap-type')
export class ApTypeController {
    constructor(private readonly service: ApTypeService) { }

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
    create(@Body() payload: CreateApTypeDto) {
        return this.service.create(payload);
    }

    @ApiOperation({ summary: `${UserRole.ADMIN}` })
    @UseGuards(GuardService, RoleGuardService)
    @Role(UserRole.ADMIN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() payload: UpdateApTypeDto,
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
