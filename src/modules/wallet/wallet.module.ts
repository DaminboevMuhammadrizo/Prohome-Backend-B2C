import { Global, Module } from '@nestjs/common';
import { AdminWalletController } from './admin-wallet.controller';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

// Global qilingan — auth.service.ts (ro'yxat bonusi + kunlik strike) va
// real-estate/job/master/news/reels servislari (boost bo'yicha saralash)
// WalletService'ni alohida `imports: [WalletModule]` qo'shmasdan ishlata olishi
// uchun (NotificationModule'dagi @Global() naqshiga mos).
@Global()
@Module({
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
