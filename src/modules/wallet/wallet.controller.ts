import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import { BoostCostQueryDto, PurchaseBoostDto, RequestTopUpDto, WalletTxQueryDto } from './dto/wallet.dto';
import { WalletService } from './wallet.service';

// Ichki valyuta (coin) — foydalanuvchi uchun. Hammasi login talab qiladi.
@ApiTags('Wallet (Ichki valyuta)')
@ApiBearerAuth()
@UseGuards(GuardService)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @ApiOperation({
    summary: "Mening hamyonim — balans, strike, referral link uchun kod",
    description:
      'Javob: `{ balance, currencyName, currentStreak, longestStreak, referralCode, lastCheckInAt, recentTransactions }`. ' +
      "`referralCode` orqali frontend o'zi referral link yasaydi (masalan https://prohome.uz/register?ref=<referralCode> " +
      'yoki mobil deep-link) — sayt va mobil bir xil kodni ishlatadi.',
  })
  getMyWallet(@UserData() user: JwtPayload) {
    return this.walletService.getMyWallet(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: "Mening tranzaksiyalarim tarixi (bonus, boost, top-up — hammasi)" })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getMyTransactions(@UserData() user: JwtPayload, @Query() query: WalletTxQueryDto) {
    return this.walletService.getMyTransactions(user.id, query.page, query.limit);
  }

  @Post('topup-request')
  @ApiOperation({
    summary: "Haqiqiy pulga valyuta sotib olish so'rovi",
    description:
      "Hozircha to'lov tizimi (Payme/Click) ulanmagan — so'rov PENDING holatda yaraladi, admin tashqarida " +
      "to'lovni tekshirib tasdiqlaydi (`PATCH /wallet/admin/topup-requests/:id/approve`), shundan keyin balansga qo'shiladi.",
  })
  requestTopUp(@UserData() user: JwtPayload, @Body() dto: RequestTopUpDto) {
    return this.walletService.requestTopUp(user.id, dto.amount, dto.note);
  }

  @Get('boost/cost')
  @ApiOperation({ summary: "Boost narxini oldindan ko'rish (admin belgilagan kun-narxiga ko'ra)" })
  @ApiQuery({ name: 'days', required: true, example: 7 })
  async getBoostCost(@Query() query: BoostCostQueryDto) {
    const cost = await this.walletService.getBoostCost(query.days);
    return { days: query.days, cost };
  }

  @Post('boost')
  @ApiOperation({
    summary: "E'lonni/kontentni 'eng tepada' ko'rsatish uchun coin sarflash",
    description:
      "`entityType` + `entityId` — qaysi kontent (REAL_ESTATE/JOB/MASTER/NEWS/REELS). Faqat shu kontentning " +
      "egasi (admin esa istalganini, bepul) boost qila oladi. Narx = admin belgilagan `boostCostPerDay * days`. " +
      "Agar kontent allaqachon boost qilingan bo'lsa — yangi muddat MAVJUDGA QO'SHILADI (ustiga yozilmaydi).",
  })
  purchaseBoost(@UserData() user: JwtPayload, @Body() dto: PurchaseBoostDto) {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    return this.walletService.purchaseBoost(user.id, isAdmin, dto.entityType, dto.entityId, dto.days);
  }
}
