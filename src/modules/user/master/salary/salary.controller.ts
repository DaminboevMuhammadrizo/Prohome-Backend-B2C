import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateSalaryTypeDto } from './dto/create.salary.dto';
import { UpdateSalaryTypeDto } from './dto/update.salary.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { SalaryTypeService } from './salary.service';

@ApiTags('Salary Types')
@Controller('salary-types')
export class SalaryTypeController {
  constructor(private readonly salaryTypeService: SalaryTypeService) {}

  @Get('all')
  @ApiOperation({ summary: '' })
  findAll() {
    return this.salaryTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salaryTypeService.findOne(id);
  }

  @Post('create')
  @ApiOperation({ summary: '' })
  create(@Body() createSalaryTypeDto: CreateSalaryTypeDto) {
    return this.salaryTypeService.create(createSalaryTypeDto);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: '' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalaryTypeDto: UpdateSalaryTypeDto,
  ) {
    return this.salaryTypeService.update(id, updateSalaryTypeDto);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salaryTypeService.remove(id);
  }
}
