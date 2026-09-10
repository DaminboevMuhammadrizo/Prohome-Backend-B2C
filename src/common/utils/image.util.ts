import sharp from 'sharp';

// Yuklangan rasmlarni bir xilda optimallashtiradi:
//  - EXIF orientation bo'yicha aylantiradi (telefon rasmlari yonboshlab qolmasin)
//  - uzun tomonni `maxSize` (default 1600px) gacha kichraytiradi (kattalashtirmaydi)
//  - WebP (default quality 76) ga o'giradi
// Natijada oddiy telefon surati ~150-300KB ga tushadi (asl JPEG ~2-6MB o'rniga).
export async function toOptimizedWebp(
  buffer: Buffer,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<Buffer> {
  const { maxSize = 1600, quality = 76 } = opts;
  return sharp(buffer)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();
}
