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
  // Narx topilgan qatorning o'zi (masalan "22 000 $" yoki "3.630.000.000 сўм
  // (≈300.000$)") — `priceDesc` sifatida saqlash uchun, foydalanuvchi/admin
  // asl ko'rinishni ko'rishi uchun.
  pricePrimaryText: string | null;
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
  // true — bu "sotiladi/ijaraga beriladi" e'loni EMAS, balki "kvartira kerak"/
  // "sherik qidirilmoqda" kabi TALAB (demand) posti — import qilinmasligi kerak.
  isDemandPost: boolean;
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
  // "сотилади"/"ижарага" — o'zbekcha so'zlarning KIRILL yozuvi (ko'plab
  // kanallar — Namangan, Уй Бозор, Навоий — shu yozuvda yozadi).
  private readonly rentWords = /ijara|ijaraga|ижарага|арендуется|сдается|сдаю|сдам|аренда/i;
  private readonly saleWords = /sotiladi|sotuv|sotaman|сотилади|сотиш|сотув|продается|продаю|продажа/i;

  // Diqqat: JS regex'da \b (word boundary) faqat lotin \w bilan ishlaydi,
  // kirill harflar atrofida ishonchli emas — shuning uchun kirill so'zlarga
  // \b qo'yilmagan, faqat bo'sh joy/qatorlar bilan chegaralangan deb hisoblanadi.
  // "(?<!-)\bdom\b" — manzildagi "46-dom" (bino raqami) yolg'on-musbat
  // bermasligi uchun (hyphen bilan bevosita ulangan "dom" e'tiborga olinmaydi).
  private readonly houseWords = /\buy\b|hovli|(?<!-)\bdom\b|dacha|коттедж|(^|\s)дом(\s|$|[.,!?])/i;
  private readonly officeWords = /ofis|офис/i;
  private readonly retailWords = /do'kon|magazin|торгов|savdo/i;

  // Ixtiyoriy qavslarni ham qo'llab-quvvatlaydi: "+998-(93)-550-88-53"
  private readonly phoneRegex = /(?:\+?998)?[\s\-]?\(?(\d{2})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})\b/;
  // Format 1: "3 xonali", "2-комн", "4 та хона" — raqam avval. Bo'shliq faqat
  // BIR QATOR ichida (\n EMAS) — aks holda "Этаж. - 7\nХона. - 3" kabi
  // jadval formatida "7" bilan keyingi qatordagi "Хона" noto'g'ri bog'lanib
  // qolishi mumkin edi.
  private readonly roomRegexNumberFirst = /(\d{1,2})[ \t]*(?:та)?[ \t\-]?(xona|xonali|хона|хонали|комн|к\.кв|комнатная)/i;
  // narx: 3+ xonali raqam, ixtiyoriy bo'shliq bilan ajratilgan, keyin valyuta belgisi.
  // "🍋" ba'zi kanallarda ("Namangan Uylari") "$" o'rniga hazil sifatida ishlatiladi.
  private readonly priceRegex = /([\d\s.,]{4,})\s*(\$|🍋|у\.?\s?е\.?|so'?m|сум|доллар|дол\.)/i;
  // Narx m² UCHUN ko'rsatilgan holat: "400$/m2", "400 $ za m2", "400у.е. за м2".
  // Bunday bo'lsa `price` shunchaki 400 emas — umumiy narx (pricePerSqm * areaSize).
  private readonly pricePerSqmRegex =
    /([\d\s.,]{2,})\s*(\$|у\.?\s?е\.?|so'?m|сум|доллар|дол\.)\s*(?:\/|za|за)\s*(m2|м2|kv\.?\s?m|кв\.?\s?м)/i;
  // "Нархи: 3.630.000.000 сўм (≈300.000$)" kabi — сум va tахminiy $ ekvivalenti
  // birga yozilgan holatlar. Bazadagi `price` doim USD bo'lgani uchun, bunday
  // holatda taxminiy $ qiymati ustuvor olinadi (сум emas).
  private readonly approxUsdRegex = /[\(\[]\s*[≈~]\s*([\d\s.,]{2,})\s*\$\s*[\)\]]/;
  private readonly addressLineRegex = /tuman|mahalla|ko'cha|rayon|массив|мкр|kvartal|мавзе/i;
  // Format 1: "60 m2", "45 kv.m" — raqam avval
  private readonly areaRegexNumberFirst = /(\d{1,4}(?:[.,]\d+)?)\s*(m2|м2|кв\.?\s?м)/i;
  private readonly idRegex = /\bid\s*[➖\-:]?\s*(\d+)/i;
  // "[oOоО]риентир" — real postlarda "Ориентир" so'zi ba'zan Lotin "O" bilan
  // yozilib qoladi ("Oриентир" — vizual jihatdan bir xil, lekin boshqa
  // kodli belgi), oddiy "/ориентир/i" buni ushlamaydi.
  private readonly orientirRegex = /[oOоО]риентир|mo'ljal/i;
  // "🌐 Манзил: ..." yoki "Manzil: ..." — aniq yorliqli manzil qatori. Bu
  // topilsa "📍" belgisidan USTUVOR (ba'zi kanallarda 📍 aslida "Ориентир"
  // qatorini belgilaydi, manzil emas — masalan "📍 Oриентир: ...").
  private readonly addressLabelRegex = /(?:манзил|manzil)\s*[:\-]\s*(.+)/i;
  // "Kvartira kerak", "sherik qidirilmoqda" kabi TALAB (demand) postlarini
  // aniqlash uchun — bular haqiqiy e'lon emas, import qilinmasligi kerak.
  private readonly demandWords = /\bkerak\b|керак\b|qidir(il)?moqda|излаяпман|izlayapman|qidiryap|sheriklikda|sherik\s*(qidir|olaman|kerak)/i;
  // Diqqat: bare "ijara"/"sotiladi" so'zlari demand-postlarda ham uchraydi
  // ("ijaraga xonadon KERAK" — bu talab, taklif emas), shuning uchun
  // isDemandPost ANIQLASHDA rentWords/saleWords EMAS, faqat TO'LIQ taklif
  // iborasini ("ijaraga BERILADI") talab qiladigan shu alohida ro'yxat ishlatiladi.
  private readonly supplyWords =
    /sotiladi|sotuv\b|sotaman|сотилади|сотиш\b|сотув\b|продается|продаю|продажа|ijaraga\s*beriladi|ижарага\s*берила|сдается|сдаю|сдам/i;

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

    // Narx — ustuvorlik tartibi:
    //  1) "Нархи: X сўм (≈Y$)" — сум va taxminiy $ ekvivalenti birga bo'lsa,
    //     bazadagi `price` doim USD bo'lgani uchun $ qiymati olinadi (сум emas).
    //  2) "400$/m2" — narx m² UCHUN ko'rsatilgan bo'lsa, umumiy narx =
    //     m² narxi * maydon deb hisoblanadi (aks holda 75m² uy 400$ emas,
    //     30000$ turadi degan noto'g'ri natija chiqardi).
    //  3) oddiy "22 000 $" / "250 sum" kabi to'g'ridan-to'g'ri narx.
    let price: number | null = null;
    let pricePerSqm: number | null = null;
    let priceIsPerSqm = false;
    let pricePrimaryText: string | null = null;

    const approxUsdMatch = text.match(this.approxUsdRegex);
    if (approxUsdMatch) {
      const cleaned = approxUsdMatch[1].replace(/[\s.,]/g, '');
      const parsed = parseInt(cleaned, 10);
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed;
        pricePrimaryText = (lines.find((l) => this.approxUsdRegex.test(l)) ?? approxUsdMatch[0]).trim();
      }
    }

    if (price === null) {
      const perSqmMatch = text.match(this.pricePerSqmRegex);
      if (perSqmMatch) {
        const cleaned = perSqmMatch[1].replace(/[\s.,]/g, '');
        const perSqm = parseInt(cleaned, 10);
        if (!isNaN(perSqm) && perSqm > 0) {
          pricePerSqm = perSqm;
          priceIsPerSqm = true;
          price = areaSize ? Math.round(perSqm * areaSize) : perSqm;
          pricePrimaryText = perSqmMatch[0].trim();
        }
      }
    }

    if (price === null) {
      const priceMatch = text.match(this.priceRegex);
      if (priceMatch) {
        const cleaned = priceMatch[1].replace(/[\s.,]/g, '');
        const parsed = parseInt(cleaned, 10);
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
          pricePrimaryText = priceMatch[0].trim();
        }
      }
    }
    if (price === null) missingFields.push('price');

    // Yer maydoni (sotix, 1 sotix = 100 m²) — faqat "Сотих - 2" uslubidagi jadvallarda bo'ladi
    const plotSize = this.extractLabeledNumber(text, /сотих|sotix|сотк[аи]/);

    // Qavat
    const floor = this.extractLabeledNumber(text, /этаж|qavat|қават/);

    // Bitim turi — matndan topilmasa, kanal darajasida (importFromChannel'da)
    // channel.defaultDealType orqali to'ldiriladi, chunki ko'p kanallar (masalan
    // "savdo" nomli kanal) buni har bir post ichida yozib o'tirmaydi
    let dealType: DealType | null = null;
    if (this.rentWords.test(text)) dealType = DealType.RENT;
    else if (this.saleWords.test(text)) dealType = DealType.SALE;
    else missingFields.push('dealType');

    // Mulk turi (default APARTMENT, lekin aniq so'z topilmasa ham missing qilib belgilaymiz).
    // "#участка"/"#ер" (yer/tomorqa) uchun tizimda alohida tur yo'q — eng yaqin
    // mos HOUSE ga tushiriladi (plotSize baribir alohida saqlanadi).
    let propertyType: PropertyType = PropertyType.APARTMENT;
    if (this.houseWords.test(text) || /#(участка|ер|ховли)\b/i.test(text)) propertyType = PropertyType.HOUSE;
    else if (this.officeWords.test(text)) propertyType = PropertyType.OFFICE;
    else if (this.retailWords.test(text)) propertyType = PropertyType.RETAIL;

    // Telefon
    let contactPhone: string | null = null;
    const phoneMatch = text.match(this.phoneRegex);
    if (phoneMatch) contactPhone = `+998${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}${phoneMatch[4]}`;
    else missingFields.push('contactPhone');

    // Manzil — ustuvorlik tartibi:
    //  1) Aniq "Манзил:"/"Manzil:" yorlig'i bo'lgan qator (eng ishonchli).
    //  2) "📍" belgili qator — LEKIN faqat o'sha qator "Ориентир" so'zini o'z
    //     ichiga OLMASA (ba'zi kanallarda "📍 Oриентир: ..." — bu holda 📍
    //     aslida mo'ljalni belgilaydi, manzilni emas — 1-band bunday holatda
    //     to'g'ri "Манзил:" qatorini alohida topadi).
    // "Ориентир:"/"Mo'ljal:" qatori esa har doim alohida — mo'ljal (masalan
    // "777 Mehmonxona yaqinida"). `addressCandidate` ikkalasini birlashtiradi
    // (DB'dagi bitta `address` ustuni uchun).
    const addressLabelLine = lines.find((l) => this.addressLabelRegex.test(l));
    const pinLine = lines.find((l) => l.includes('📍') && !this.orientirRegex.test(l));
    const orientirLine = lines.find((l) => this.orientirRegex.test(l));

    const addressLabelMatch = addressLabelLine?.match(this.addressLabelRegex);
    const district = addressLabelMatch
      ? this.stripLeadingSymbols(addressLabelMatch[1])
      : pinLine
        ? this.stripLeadingSymbols(pinLine.replace(/📍/g, ''))
        : null;
    const landmark = orientirLine
      ? this.stripLeadingSymbols(orientirLine.replace(/📍/g, '').replace(this.orientirRegex, '').replace(/^[:\s]+/, ''))
      : null;

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

    // Talab (demand) posti — "kvartira kerak", "sherik qidirilmoqda" kabi —
    // sotuvchi/uy egasi tomonidan emas, balki qidirayotgan odam tomonidan
    // yozilgan. Aniq "sotiladi/ijaraga beriladi" so'zi bo'lmasa va talab-so'zi
    // topilsa — bu haqiqiy e'lon emas deb belgilanadi (import qilinmaydi).
    const isDemandPost = this.demandWords.test(text) && !this.supplyWords.test(text);

    return {
      title, originalId, price, pricePerSqm, priceIsPerSqm, pricePrimaryText,
      roomCount, areaSize, plotSize, floor, dealType, propertyType, contactPhone,
      addressCandidate, district, landmark, isDemandPost, missingFields,
    };
  }

  // "Label   - 6" yoki "Label: 6" kabi jadval uslubidagi qatordan raqam ajratib oladi.
  // \b ishlatilmaydi (kirill so'zlar bilan ishlamaydi) — o'rniga label darhol
  // nuqta/bo'shliq va "-"/":" bilan tugashi shart qilib aniqlik ta'minlanadi.
  private extractLabeledNumber(text: string, labelPattern: RegExp): number | null {
    const re = new RegExp(`(?:${labelPattern.source})[.\\s]*[-:]\\s*(\\d+(?:[.,]\\d+)?)`, 'i');
    const m = text.match(re);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  // Manzil/mo'ljal matnining boshidagi belgi/emoji qoldiqlarini ("☑", "•", "-")
  // tozalaydi — faqat harf/raqam bilan boshlanadigan toza matn qoladi.
  private stripLeadingSymbols(value: string): string {
    return value.replace(/^[^\wа-яА-ЯёЁʼ'`]+/, '').trim();
  }
}
