export type BotLang = 'uz' | 'both';

export function detectLang(languageCode?: string): BotLang {
  if (!languageCode) return 'both';
  const code = languageCode.toLowerCase();
  if (code.startsWith('uz')) return 'uz';
  return 'both';
}

const uzWelcome = (name: string) =>
  `Salom ${name} 👋
@prohomeauthbot'ning rasmiy botiga xush kelibsiz
⬇️ Kontaktingizni yuboring (tugmani bosib)`;

const enWelcome = (name: string) =>
  `Hi ${name} 👋
Welcome to @prohomeauthbot's official bot
⬇️ Send your contact (by clicking button)`;

export function welcomeText(lang: BotLang, name: string): string {
  if (lang === 'uz') return uzWelcome(name);
  return `${uzWelcome(name)}\n\n${enWelcome(name)}`;
}

export function contactButtonText(lang: BotLang): string {
  if (lang === 'uz') return '📱 Kontaktni yuborish';
  return '📱 Kontaktni yuborish / Send contact';
}

export function otpMessage(lang: BotLang, code: string): string {
  const uz = `✅ Tasdiqlash kodingiz:\n<code>${code}</code>\n\nKodni ustiga bosib nusxalang va saytga kiriting. Kod 1 daqiqa amal qiladi.`;
  const en = `✅ Your verification code:\n<code>${code}</code>\n\nTap the code to copy it and enter it on the website. Valid for 1 minute.`;
  if (lang === 'uz') return uz;
  return `${uz}\n\n${en}`;
}

export function foreignContactWarning(lang: BotLang): string {
  const uz = "❗️Iltimos, faqat o'zingizning kontaktingizni yuboring.";
  const en = '❗️Please share your own contact only.';
  if (lang === 'uz') return uz;
  return `${uz}\n${en}`;
}

export const TELEGRAM_OTP_TTL = 60; // 1 daqiqa

export function telegramOtpKey(code: string): string {
  return `tglogin:otp:${code}`;
}
