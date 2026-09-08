import { Injectable } from '@nestjs/common';
import { DealType, PropertyType } from '@prisma/client';

export interface ParsedListing {
  title: string;
  price: number | null;
  roomCount: number | null;
  areaSize: number | null;
  dealType: DealType | null;
  propertyType: PropertyType | null;
  contactPhone: string | null;
  addressCandidate: string | null;
  missingFields: string[];
}

// Telegram post matnidan (o'zbek/rus aralash, erkin matn) e'lon maydonlarini
// taxminiy ajratib olish — sof regex/heuristika, tashqi bog'liqlik yo'q.
// 100% aniqlik kafolatlanmaydi, shuning uchun har doim `missingFields` bilan
// birga qaytadi — bular admin PENDING_REVIEW paytida ko'zdan kechirishi kerak.
@Injectable()
export class TelegramParserService {
  private readonly rentWords = /ijara|ijaraga|арендуется|сдается|сдаю|сдам|аренда/i;
  private readonly saleWords = /sotiladi|sotuv|sotaman|продается|продаю|продажа/i;

  // Diqqat: JS regex'da \b (word boundary) faqat lotin \w bilan ishlaydi,
  // kirill harflar atrofida ishonchli emas — shuning uchun kirill so'zlarga
  // \b qo'yilmagan, faqat bo'sh joy/qatorlar bilan chegaralangan deb hisoblanadi
  private readonly houseWords = /\buy\b|hovli|\bdom\b|dacha|коттедж|(^|\s)дом(\s|$|[.,!?])/i;
  private readonly officeWords = /ofis|офис/i;
  private readonly retailWords = /do'kon|magazin|торгов|savdo/i;

  private readonly phoneRegex = /(?:\+?998)?[\s\-]?(\d{2})[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})\b/;
  private readonly roomRegex = /(\d{1,2})\s*[-\s]?(xona|xonali|комн|к\.кв|комнатная)/i;
  // narx: 3+ xonali raqam, ixtiyoriy bo'shliq bilan ajratilgan, keyin valyuta belgisi
  private readonly priceRegex = /([\d\s.,]{4,})\s*(\$|у\.?\s?е\.?|so'?m|сум|доллар|дол\.)/i;
  private readonly addressLineRegex = /tuman|mahalla|ko'cha|rayon|массив|мкр|kvartal|мавзе/i;
  private readonly areaRegex = /(\d{1,4}(?:[.,]\d+)?)\s*(m2|м2|кв\.?\s?м|sotix|соток)/i;

  parse(rawText: string): ParsedListing {
    const text = (rawText || '').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const missingFields: string[] = [];

    // Narx
    let price: number | null = null;
    const priceMatch = text.match(this.priceRegex);
    if (priceMatch) {
      const cleaned = priceMatch[1].replace(/[\s.,]/g, '');
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed) && parsed > 0) price = parsed;
    }
    if (price === null) missingFields.push('price');

    // Xona soni
    let roomCount: number | null = null;
    const roomMatch = text.match(this.roomRegex);
    if (roomMatch) roomCount = parseInt(roomMatch[1], 10);
    else missingFields.push('roomCount');

    // Maydon (m²)
    let areaSize: number | null = null;
    const areaMatch = text.match(this.areaRegex);
    if (areaMatch) areaSize = parseFloat(areaMatch[1].replace(',', '.'));
    else missingFields.push('areaSize');

    // Bitim turi
    let dealType: DealType | null = null;
    if (this.rentWords.test(text)) dealType = DealType.RENT;
    else if (this.saleWords.test(text)) dealType = DealType.SALE;
    else missingFields.push('dealType');

    // Mulk turi (default APARTMENT, lekin aniq so'z topilmasa ham missing qilib belgilaymiz)
    let propertyType: PropertyType = PropertyType.APARTMENT;
    if (this.houseWords.test(text)) propertyType = PropertyType.HOUSE;
    else if (this.officeWords.test(text)) propertyType = PropertyType.OFFICE;
    else if (this.retailWords.test(text)) propertyType = PropertyType.RETAIL;

    // Telefon
    let contactPhone: string | null = null;
    const phoneMatch = text.match(this.phoneRegex);
    if (phoneMatch) contactPhone = `+998${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}${phoneMatch[4]}`;
    else missingFields.push('contactPhone');

    // Manzil — tuman/mahalla/ko'cha kabi kalit so'z bor qatorni qidiramiz
    let addressCandidate: string | null = lines.find((l) => this.addressLineRegex.test(l)) ?? null;
    if (!addressCandidate) missingFields.push('address');

    // Sarlavha — birinchi mazmunli qator (yoki matnning boshi)
    const title = (lines[0] || text.slice(0, 80) || "Import qilingan e'lon").slice(0, 120);

    return { title, price, roomCount, areaSize, dealType, propertyType, contactPhone, addressCandidate, missingFields };
  }
}
