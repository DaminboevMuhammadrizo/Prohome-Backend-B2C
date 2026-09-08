// Flutter/QA jamoasi uchun standart sinov akkauntlari va OTP bypass.
//
// XAVFSIZLIK: bu butunlay `ENABLE_TEST_ACCOUNTS=true` bo'lgandagina ishlaydi
// (auth.service.ts va seader.service.ts shu flagni tekshiradi). Production
// serverda bu qiymat .env'da BO'LMASLIGI kerak — aks holda har kim shu
// raqam+1617 kodi bilan test akkauntlarga kira oladi.

export const TEST_OTP_CODE = '1617';

export const TEST_CLIENT_PHONE = '+998900000001'; // oddiy foydalanuvchi (mijoz) — oldindan ro'yxatdan o'tgan
export const TEST_MASTER_PHONE = '+998900000002'; // usta — oldindan ro'yxatdan o'tgan
export const TEST_COMPANY_PHONE = '+998900000003'; // kompaniya — oldindan qo'shilgan (parol bilan kiradi, OTP shart emas)
export const TEST_REGISTER_PHONE = '+998900000009'; // ataylab RO'YXATDAN O'TKAZILMAGAN — to'liq register oqimini sinash uchun

export const TEST_PASSWORD = 'Test@1234';

// sendOtp() shu ro'yxatdagi raqamlarga (qaysi purpose bo'lishidan qat'i nazar —
// register/login/reset) haqiqiy SMS o'rniga doimiy "1617" kodini beradi.
export const TEST_OTP_BYPASS_PHONES = new Set<string>([
  TEST_CLIENT_PHONE,
  TEST_MASTER_PHONE,
  TEST_REGISTER_PHONE,
]);
