import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MasterJobService } from './master-job.service';
import { CreateMasterJobDto } from './dto/create.masterJob.dto';
import { UpdateMasterJobDto } from './dto/update.masterJob.dto';
import { PaginationDto } from '../../dto/pagination.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Master Jobs')
@Controller('master-jobs')
export class MasterJobController {
  constructor(private readonly masterJobService: MasterJobService) {}

  @Get('all')
  @ApiOperation({ summary: '' })
  @ApiQuery({ name: 'jobId', required: false, type: Number })
  @ApiQuery({ name: 'minExp', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('jobId') jobId?: number,
    @Query('minExp') minExp?: number,
    @Query('search') search?: string,
  ) {
    return this.masterJobService.getAll(pagination, { jobId, minExp, search });
  }

  @Get('top-masters/:jobId')
  @ApiOperation({ summary: '' })
  getTop(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query('limit') limit?: number,
  ) {
    return this.masterJobService.getTopMastersByJob(jobId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.masterJobService.getOneByMasterjobId(id);
  }

  @Get('by-job/:jobId')
  @ApiOperation({ summary: '' })
  findByJob(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.masterJobService.getOneJobId(jobId);
  }

  @Post('create')
  @ApiOperation({ summary: '' })
  create(@Body() createMasterJobDto: CreateMasterJobDto) {
    return this.masterJobService.create(createMasterJobDto);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: '' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMasterJobDto: UpdateMasterJobDto,
  ) {
    return this.masterJobService.update(id, updateMasterJobDto);
  }

  @Patch('increment-experience/:id')
  @ApiOperation({ summary: '' })
  increment(@Param('id', ParseIntPipe) id: number) {
    return this.masterJobService.incrementExpirence(id);
  }

  @Patch('decrement-experience/:id')
  @ApiOperation({ summary: '' })
  decrement(@Param('id', ParseIntPipe) id: number) {
    return this.masterJobService.decrementExpirence(id);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.masterJobService.remove(id);
  }
}
