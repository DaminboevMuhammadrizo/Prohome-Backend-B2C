import { Injectable } from '@nestjs/common';
import { DealType, PropertyType } from '@prisma/client';

export interface ParsedListing {
  title: string;
  originalId: string | null;
  price: number | null;
  // Agar postda narx umumiy emas, balki 1 m² uchun ko'rsatilgan bo'lsa (masalan
  // "400$/m2"), `price` allaqachon (pricePerSqm * areaSize) ga hisoblab qo'yilgan
  // bo'ladi — asl m² narxi va shu haqidagi belgi shu ikki maydonda saqlanadi,
  // admin PENDING_REVIEW paytida tekshirishi uchun.
  pricePerSqm: number | null;
  priceIsPerSqm: boolean;
  roomCount: number | null;
  areaSize: number | null;
  plotSize: number | null;
  floor: number | null;
  dealType: DealType | null;
  propertyType: PropertyType | null;
  contactPhone: string | null;
  addressCandidate: string | null;
  district: string | null;
  landmark: string | null;
  missingFields: string[];
}

// Telegram post matnidan (o'zbek/rus aralash, erkin matn) e'lon maydonlarini
// taxminiy ajratib olish — sof regex/heuristika, tashqi bog'liqlik yo'q.
// Ikki xil formatni ham qo'llab-quvvatlaydi:
//   1) Erkin matn: "3 xonali kvartira ... 60 m2"   (raqam — so'zdan OLDIN)
//   2) Jadval uslubi: "Хона  - 6" / "Этаж. - 3"      (so'z (label) — raqamdan OLDIN,
//      Farg'ona kabi ko'plab real kanallarda shu uslub ishlatiladi)
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
  // Format 1: "3 xonali", "2-комн" — raqam avval
  private readonly roomRegexNumberFirst = /(\d{1,2})\s*[-\s]?(xona|xonali|комн|к\.кв|комнатная)/i;
  // narx: 3+ xonali raqam, ixtiyoriy bo'shliq bilan ajratilgan, keyin valyuta belgisi
  private readonly priceRegex = /([\d\s.,]{4,})\s*(\$|у\.?\s?е\.?|so'?m|сум|доллар|дол\.)/i;
  // Narx m² UCHUN ko'rsatilgan holat: "400$/m2", "400 $ za m2", "400у.е. за м2".
  // Bunday bo'lsa `price` shunchaki 400 emas — umumiy narx (pricePerSqm * areaSize).
  private readonly pricePerSqmRegex =
    /([\d\s.,]{2,})\s*(\$|у\.?\s?е\.?|so'?m|сум|доллар|дол\.)\s*(?:\/|za|за)\s*(m2|м2|kv\.?\s?m|кв\.?\s?м)/i;
  private readonly addressLineRegex = /tuman|mahalla|ko'cha|rayon|массив|мкр|kvartal|мавзе/i;
  // Format 1: "60 m2", "45 kv.m" — raqam avval
  private readonly areaRegexNumberFirst = /(\d{1,4}(?:[.,]\d+)?)\s*(m2|м2|кв\.?\s?м)/i;
  private readonly idRegex = /\bid\s*[➖\-:]?\s*(\d+)/i;
  private readonly orientirRegex = /ориентир|mo'ljal/i;

  parse(rawText: string): ParsedListing {
    const text = (rawText || '').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const missingFields: string[] = [];

    // Xona soni — avval "3 xonali" uslubi, topilmasa "Хона - 6" (label-qiymat) uslubi
    let roomCount: number | null = null;
    const roomMatch = text.match(this.roomRegexNumberFirst);
    if (roomMatch) roomCount = parseInt(roomMatch[1], 10);
    else {
      const labeled = this.extractLabeledNumber(text, /хона|xona/);
      if (labeled !== null) roomCount = Math.round(labeled);
    }
    if (roomCount === null) missingFields.push('roomCount');

    // Bino maydoni (m²) — "60 m2" yoki "Майдони - 69.65". Narxni to'g'ri
    // hisoblash uchun (pastga qarang) areaSize price'dan OLDIN aniqlanishi shart.
    let areaSize: number | null = null;
    const areaMatch = text.match(this.areaRegexNumberFirst);
    if (areaMatch) areaSize = parseFloat(areaMatch[1].replace(',', '.'));
    else {
      const labeled = this.extractLabeledNumber(text, /майдони|maydoni|maydon/);
      if (labeled !== null) areaSize = labeled;
    }
    if (areaSize === null) missingFields.push('areaSize');

    // Narx — avval "narx m² uchun" (400$/m2) uslubini tekshiramiz: agar shunday
    // bo'lsa va maydon (areaSize) ma'lum bo'lsa, umumiy narx = m² narxi * maydon
    // deb hisoblanadi (aks holda "400$" yozib qo'yish umumiy narx sifatida
    // noto'g'ri ko'rsatiladi — masalan 75m² uy 400$ emas, 30000$ turadi).
    let price: number | null = null;
    let pricePerSqm: number | null = null;
    let priceIsPerSqm = false;
    const perSqmMatch = text.match(this.pricePerSqmRegex);
    if (perSqmMatch) {
      const cleaned = perSqmMatch[1].replace(/[\s.,]/g, '');
      const perSqm = parseInt(cleaned, 10);
      if (!isNaN(perSqm) && perSqm > 0) {
        pricePerSqm = perSqm;
        priceIsPerSqm = true;
        price = areaSize ? Math.round(perSqm * areaSize) : perSqm;
      }
    }
    if (price === null) {
      const priceMatch = text.match(this.priceRegex);
      if (priceMatch) {
        const cleaned = priceMatch[1].replace(/[\s.,]/g, '');
        const parsed = parseInt(cleaned, 10);
        if (!isNaN(parsed) && parsed > 0) price = parsed;
      }
    }
    if (price === null) missingFields.push('price');

    // Yer maydoni (sotix, 1 sotix = 100 m²) — faqat "Сотих - 2" uslubidagi jadvallarda bo'ladi
    const plotSize = this.extractLabeledNumber(text, /сотих|sotix|сотк[аи]/);

    // Qavat
    const floor = this.extractLabeledNumber(text, /этаж|qavat/);

    // Bitim turi — matndan topilmasa, kanal darajasida (importFromChannel'da)
    // channel.defaultDealType orqali to'ldiriladi, chunki ko'p kanallar (masalan
    // "savdo" nomli kanal) buni har bir post ichida yozib o'tirmaydi
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

    // Manzil — 📍 belgisi bilan boshlangan qator (tuman/shahar), "Ориентир:"
    // qatori esa alohida — mo'ljal (masalan "777 Mehmonxona yaqinida"). Ikkalasi
    // ham alohida saqlanadi (tavsifda alohida qator + geocoding'da alohida
    // urinish uchun), `addressCandidate` esa ikkalasini birlashtirgan holda
    // (DB'dagi bitta `address` ustuni uchun).
    const pinLine = lines.find((l) => l.includes('📍'));
    const orientirLine = lines.find((l) => this.orientirRegex.test(l));
    const district = pinLine ? pinLine.replace(/📍/g, '').trim() : null;
    const landmark = orientirLine ? orientirLine.replace(this.orientirRegex, '').replace(/^[:\s]+/, '').trim() : null;

    let addressCandidate: string | null = null;
    if (district) {
      addressCandidate = landmark ? `${district}, ${landmark}` : district;
    } else {
      addressCandidate = lines.find((l) => this.addressLineRegex.test(l)) ?? null;
    }
    if (!addressCandidate) missingFields.push('address');

    // Kanaldagi ichki ID raqami — foydalanuvchiga ko'rsatilmaydi (sarlavhaga
    // qo'shilmaydi), faqat audit/qidiruv uchun alohida saqlanadi
    const idMatch = text.match(this.idRegex);
    const originalId = idMatch ? idMatch[1] : null;

    // Sarlavha — manzil bo'lsa o'shandan, aks holda birinchi "mazmunli"
    // (faqat emojidan iborat bo'lmagan, ID qatori ham hisobga olinmaydi) qator
    const meaningfulLine = lines.find((l) => /[a-zA-Zа-яА-ЯёЁʼ'`]{3,}/.test(l) && !this.idRegex.test(l));
    const title = (addressCandidate || meaningfulLine || text.slice(0, 80) || "Import qilingan e'lon").slice(0, 120);

    return { title, originalId, price, pricePerSqm, priceIsPerSqm, roomCount, areaSize, plotSize, floor, dealType, propertyType, contactPhone, addressCandidate, district, landmark, missingFields };
  }

  // "Label   - 6" yoki "Label: 6" kabi jadval uslubidagi qatordan raqam ajratib oladi.
  // \b ishlatilmaydi (kirill so'zlar bilan ishlamaydi) — o'rniga label darhol
  // nuqta/bo'shliq va "-"/":" bilan tugashi shart qilib aniqlik ta'minlanadi.
  private extractLabeledNumber(text: string, labelPattern: RegExp): number | null {
    const re = new RegExp(`(?:${labelPattern.source})[.\\s]*[-:]\\s*(\\d+(?:[.,]\\d+)?)`, 'i');
    const m = text.match(re);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }
}
