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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create.user.dto';
import { UpdateUserDto } from './dto/updater.user.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  @ApiOperation({ summary: '' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get('all-active')
  @ApiOperation({ summary: '' })
  findAllActive(@Query() pagination: PaginationDto) {
    return this.userService.getAllActive(pagination);
  }

  @Get('all-archived')
  @ApiOperation({ summary: '' })
  findAllArchived(@Query() pagination: PaginationDto) {
    return this.userService.getAllArchived(pagination);
  }

  @Get('active/:id')
  @ApiOperation({ summary: '' })
  findOneActive(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getOneUserActive(id);
  }

  @Get('archived/:id')
  @ApiOperation({ summary: '' })
  findOneArchived(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getOneUserArchived(id);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: "" })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('status-toggle/:id')
  @ApiOperation({ summary: "" })
  toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.userService.updateStatusToogle(id);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: "" })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }
}
