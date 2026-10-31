import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { Role } from 'src/common/decorators/role.decorator';
import { GuardService } from 'src/common/guard/guard.service';
import { RoleGuardService } from 'src/common/role_guard/role_guard.service';
import { AdjustBalanceDto, TopUpQueryDto, UpdateCurrencySettingsDto } from './dto/wallet.dto';
import { WalletService } from './wallet.service';

// Ichki valyuta tizimini boshqarish — faqat ADMIN/SUPERADMIN.
@ApiTags('Wallet (Admin)')
@ApiBearerAuth()
@UseGuards(GuardService, RoleGuardService)
@Role(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('wallet/admin')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Ichki valyuta sozlamalari',
    description: "`currencyName`, `signupBonus`, `referralBonus`, `dailyCheckInBonus`, `boostCostPerDay` (1 kun boost narxi).",
  })
  getSettings() {
    return this.walletService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Ichki valyuta sozlamalarini yangilash' })
  updateSettings(@Body() dto: UpdateCurrencySettingsDto) {
    return this.walletService.updateSettings(dto);
  }

  @Get('topup-requests')
  @ApiOperation({
    summary: "Haqiqiy pulga top-up so'rovlari ro'yxati",
    description: "Javob: `{ data: TopUpRequest[], meta: {...} }`. `status=PENDING` — hali ko'rib chiqilmaganlar.",
  })
  listTopUpRequests(@Query() query: TopUpQueryDto) {
    return this.walletService.listTopUpRequests(query);
  }

  @Patch('topup-requests/:id/approve')
  @ApiOperation({ summary: "Top-up so'rovini tasdiqlash — balansga qo'shiladi" })
  approveTopUp(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.walletService.approveTopUp(id, user.id);
  }

  @Patch('topup-requests/:id/reject')
  @ApiOperation({ summary: "Top-up so'rovini rad etish" })
  rejectTopUp(@Param('id', ParseIntPipe) id: number, @UserData() user: JwtPayload) {
    return this.walletService.rejectTopUp(id, user.id);
  }

  @Post('adjust')
  @ApiOperation({
    summary: "Foydalanuvchi balansini qo'lda tuzatish",
    description: "`amount` musbat bo'lsa — qo'shiladi, manfiy bo'lsa — ayiriladi. Ledger'da ADMIN_ADJUSTMENT turi bilan qayd etiladi.",
  })
  adjustBalance(@Body() dto: AdjustBalanceDto) {
    return this.walletService.adjustBalance(dto);
  }
}
