// GET javoblarini Redis'da qancha ushlab turish (soniyada). Asosiy tozalash
// har create/update/delete da darhol `delByPattern` orqali bo'ladi — bu TTL faqat
// "agar biror invalidatsiya o'tkazib yuborilsa" degan xavfsizlik chegarasi.
// Qiymatlar SHU YERDA (oddiy faylda) turadi — .env dan olinmaydi. O'zgartirish
// kerak bo'lsa shu raqamlarni tahrirlab qayta build qilinadi.

// 1 oy
export const CACHE_TTL = 30 * 24 * 60 * 60;

// Statistik (analytics) javoblar uchun qisqaroq muddat — bu yerda aniq
// invalidatsiya qilinmaydi, biroz kechikish joiz. 1 soat.
export const ANALYTICS_CACHE_TTL = 60 * 60;

// Cache kaliti yasash: `<ns>:list:<params>` yoki `<ns>:item:<id>`.
export function cacheKey(ns: string, kind: 'list' | 'item', payload: unknown): string {
  const raw = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  return `${ns}:${kind}:${Buffer.from(raw).toString('base64url')}`;
}
