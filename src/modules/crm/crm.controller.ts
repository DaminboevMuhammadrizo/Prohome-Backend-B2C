import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import {
  CreateComplexInterestDto,
  CreateLeadDto,
  CreateSearchSessionDto,
  SubmitSearchSurveyDto,
  UpdateLeadStatusDto,
} from './dto/create-lead.dto';
import { CrmService } from './crm.service';

@ApiTags('CRM')
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  @ApiOperation({ summary: 'Lead yaratish yoki callback request qoldirish' })
  createLead(@Body() dto: CreateLeadDto) {
    return this.crmService.createLead(undefined, dto);
  }

  @Post('complexes/:id/interest')
  @ApiOperation({ summary: 'Complex yoki uyga qiziqish yozuvini saqlash' })
  createComplexInterest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateComplexInterestDto,
  ) {
    return this.crmService.createComplexInterest(id, dto);
  }

  @Post('search-sessions')
  @ApiOperation({ summary: 'Search sessionni saqlash' })
  createSearchSession(@Body() dto: CreateSearchSessionDto) {
    return this.crmService.createSearchSession(undefined, dto);
  }

  @Post('search-sessions/:id/survey')
  @ApiOperation({ summary: 'Topdingizmi survey javobini saqlash' })
  submitSearchSurvey(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitSearchSurveyDto,
  ) {
    return this.crmService.submitSearchSurvey(id, undefined, dto);
  }

  @Get('company/dashboard')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Company CRM dashboard' })
  getCompanyDashboard(@UserData() user: JwtPayload) {
    return this.crmService.getCompanyDashboard(user);
  }

  @Get('company/leads')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Company uchun leadlar, like va interestlar' })
  getCompanyLeads(@UserData() user: JwtPayload) {
    return this.crmService.getCompanyLeads(user);
  }

  @Get('leads/:id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Lead detailini ochish va audit yuborish' })
  getLead(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.crmService.getLead(id, user);
  }

  @Patch('leads/:id/status')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Lead statusini yangilash' })
  updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadStatusDto,
    @UserData() user: JwtPayload,
  ) {
    return this.crmService.updateLeadStatus(id, dto.status, user);
  }

  @Delete('leads/:id')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'Leadni o‘chirish va Telegramga reply audit yuborish' })
  deleteLead(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.crmService.deleteLead(id, user);
  }

  @Get('landing/recommendations')
  @ApiBearerAuth()
  @UseGuards(GuardService)
  @ApiOperation({ summary: 'User lokatsiyasiga yaqin tavsiyalar' })
  getLandingRecommendations(@UserData() user: JwtPayload) {
    return this.crmService.getLandingRecommendations(user);
  }
}
