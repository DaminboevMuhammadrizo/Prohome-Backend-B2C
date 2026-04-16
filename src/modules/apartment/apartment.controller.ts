import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { fileStorages } from 'src/common/types/upload_types';
import { ApartmentService } from './apartment.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { ApartmentQueryDto } from './dto/apartment-query.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@ApiTags('Apartments')
@Controller('apartments')
export class ApartmentController {
  constructor(private readonly apartmentService: ApartmentService) {}

  private validateImages(files: Express.Multer.File[], isCreate = false) {
    if (isCreate && files.length < 3) {
      throw new BadRequestException(
        'Apartment yaratishda kamida 3 ta rasm yuborilishi kerak',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Apartmentlar ro‘yxati' })
  getAll(@Query() query: ApartmentQueryDto) {
    return this.apartmentService.getAll(query);
  }

  @Get('sold/all')
  @ApiOperation({ summary: 'Sotilgan uylar ro‘yxati' })
  getSoldApartments(@Query() query: ApartmentQueryDto) {
    return this.apartmentService.getSoldApartments(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta apartment' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentService.getOne(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Apartment ma\'lumotlarini PDF qilib olish' })
  async exportPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.apartmentService.exportPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return file.buffer;
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Apartment view yozuvi qo‘shish' })
  addView(@Param('id', ParseIntPipe) id: number) {
    return this.apartmentService.addView(id);
  }

  @Get(':id/interaction')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Current user uchun apartment interaction statusi' })
  getInteractionState(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
  ) {
    return this.apartmentService.getInteractionState(id, user);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @UseInterceptors(FilesInterceptor('images', 20, fileStorages(['image'])))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'titleUz',
        'titleUzCyrl',
        'titleRu',
        'price',
        'area',
        'roomCount',
        'regionId',
        'categoryId',
        'address',
        'images',
      ],
      properties: {
        titleUz: { type: 'string' },
        titleUzCyrl: { type: 'string' },
        titleRu: { type: 'string' },
        descriptionUz: { type: 'string' },
        descriptionUzCyrl: { type: 'string' },
        descriptionRu: { type: 'string' },
        price: { type: 'number' },
        area: { type: 'number' },
        roomCount: { type: 'number' },
        floor: { type: 'number' },
        totalFloors: { type: 'number' },
        landArea: { type: 'number' },
        isCottage: { type: 'boolean' },
        listingType: { type: 'string' },
        regionId: { type: 'number' },
        categoryId: { type: 'number' },
        address: { type: 'string' },
        complexId: { type: 'number' },
        layoutId: { type: 'number' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Apartment yaratish' })
  create(
    @UserData() user: JwtPayload,
    @Body() dto: CreateApartmentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.validateImages(files ?? [], true);
    return this.apartmentService.create(user, dto, files ?? []);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment like toggle' })
  toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
  ) {
    return this.apartmentService.toggleLike(id, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @UseInterceptors(FilesInterceptor('images', 20, fileStorages(['image'])))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        titleUz: { type: 'string' },
        titleUzCyrl: { type: 'string' },
        titleRu: { type: 'string' },
        descriptionUz: { type: 'string' },
        descriptionUzCyrl: { type: 'string' },
        descriptionRu: { type: 'string' },
        price: { type: 'number' },
        area: { type: 'number' },
        roomCount: { type: 'number' },
        floor: { type: 'number' },
        totalFloors: { type: 'number' },
        landArea: { type: 'number' },
        isCottage: { type: 'boolean' },
        listingType: { type: 'string' },
        regionId: { type: 'number' },
        categoryId: { type: 'number' },
        address: { type: 'string' },
        complexId: { type: 'number' },
        layoutId: { type: 'number' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Apartment yangilash' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateApartmentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.apartmentService.update(id, user, dto, files ?? []);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment statusini ozgartirish' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @UserData() user: JwtPayload,
    @Body() dto: UpdateApartmentStatusDto,
  ) {
    return this.apartmentService.updateStatus(id, user, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Apartment o‘chirish' })
  delete(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.apartmentService.delete(id, user);
  }
}
