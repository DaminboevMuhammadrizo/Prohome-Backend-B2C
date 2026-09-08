/**
 * Bir martalik interaktiv Telegram (userbot/MTProto) login skripti.
 *
 * NIMA UCHUN KERAK: bot API (Telegraf) faqat admin qilingan kanaldagi postlarni
 * o'qiy oladi. Bu skript esa oddiy Telegram hisobi kabi ulanadigan sessiya
 * yaratadi — shu sessiya bilan ilova ochiq kanallarga (admin bo'lmasdan ham)
 * obuna bo'lib, postlarni o'qiy oladi.
 *
 * QANDAY ISHLATISH (buni O'ZINGIZNING terminalingizda ishga tushiring —
 * Telegram kodi sizning telefoningizga keladi, buni faqat siz kirita olasiz):
 *
 *   1) https://my.telegram.org ga kiring (o'z Telegram raqamingiz bilan)
 *      -> "API development tools" -> yangi ilova yarating
 *      -> api_id va api_hash ni oling
 *
 *   2) Shu ikkalasini TELEGRAM_API_ID / TELEGRAM_API_HASH sifatida .env ga
 *      vaqtincha qo'ying (yoki quyidagi buyruqqa environment sifatida bering)
 *
 *   3) Ishga tushiring:
 *        npx ts-node scripts/telegram-login.ts
 *      Skript telefon raqamingizni, keyin Telegram yuborgan kodni (va agar
 *      ikki bosqichli tasdiqlash yoqilgan bo'lsa parolni) so'raydi.
 *
 *   4) Muvaffaqiyatli ulangach, skript "session" satrini chop etadi —
 *      shuni .env dagi TELEGRAM_SESSION ga joylashtiring. Shundan keyin
 *      backend avtomatik ulanadi, bu skriptni qayta ishga tushirish shart
 *      emas.
 *
 * DIQQAT: chiqadigan session qatori — bu sizning Telegram hisobingizga
 * to'liq kirish huquqi (parol kabi). Uni hech kimga bermang, faqat .env
 * ga (git'ga tushmaydigan joyga) saqlang.
 */

import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
// @ts-ignore — "input" paketida rasmiy TS turi yo'q
import input from 'input';

async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    console.error('❌ TELEGRAM_API_ID va TELEGRAM_API_HASH .env da (yoki environment\'da) topilmadi.');
    console.error('   my.telegram.org dan oling va shu ikkalasini vaqtincha qo\'ying.');
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });

  console.log('Telegram bilan bog\'lanilmoqda...\n');

  await client.start({
    phoneNumber: async () => await input.text('Telefon raqamingiz (masalan +998901234567): '),
    password: async () => await input.text('Ikki bosqichli tasdiqlash paroli (bo\'lmasa Enter): '),
    phoneCode: async () => await input.text('Telegram\'dan kelgan kod: '),
    onError: (err) => console.error('Xatolik:', err),
  });

  console.log('\n✅ Muvaffaqiyatli ulandi!\n');
  console.log('Quyidagi qatorni .env fayliga TELEGRAM_SESSION sifatida qo\'ying:\n');
  console.log('TELEGRAM_SESSION=' + client.session.save());
  console.log('\n(Bu — hisobingizga to\'liq kirish huquqi, hech kimga bermang.)');

  await client.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('Kutilmagan xatolik:', e);
  process.exit(1);
});
