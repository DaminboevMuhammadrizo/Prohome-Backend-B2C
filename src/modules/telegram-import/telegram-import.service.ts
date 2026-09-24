import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DealType, MediaType, PropertyType, RealEstateStatus, SellerType, TelegramImportChannel, UserRole, UserStatus } from '@prisma/client';
import { mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { Api } from 'telegram';
import { PrismaService } from 'src/common/database/prisma.service';
import { haversineKm } from 'src/common/utils/geo.util';
import { toOptimizedWebp } from 'src/common/utils/image.util';
import { AddChannelDto, UpdateChannelDto } from './dto/telegram-import.dto';
import { GeocodingService } from './geocoding.service';
import { TelegramClientService } from './telegram-client.service';
import { ParsedListing, TelegramParserService } from './telegram-parser.service';

// Import qilingan e'lonlar shu "tizim" foydalanuvchisiga bog'lanadi (asl muallif
// noma'lum/tekshirilmagan) — admin PENDING_REVIEW'da ko'rib, kerak bo'lsa keyin
// haqiqiy egasiga o'tkazishi mumkin.
const IMPORT_SYSTEM_USER_PHONE = '+998000000000';

// Frontend (AddPropertyPage.tsx) shu marker orqali description ichiga
// titleUz/descriptionUz kabi qo'shimcha maydonlarni yashirin JSON qilib
// qo'shadi — import qilingan e'lonlar ham xuddi shu konventsiyaga mos
// bo'lishi uchun (foydalanuvchi ko'rganda xom Telegram matni emas, toza
// tuzilgan matn ko'rinishi uchun) bu yerda ham qayta ishlatiladi.
const DETAIL_MARKER = '---PROHOME_REAL_ESTATE_DETAILS---';

const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  APARTMENT: 'Kvartira',
  HOUSE: "Hovli-uy",
  OFFICE: 'Ofis',
  RETAIL: 'Tijorat obyekti',
};

// Telegram postlari ko'pincha kirill alifbosida ("Фаргона шахар"), bazadagi
// joylashuv nomlari esa lotin alifbosida ("Farg'ona") — moslashtirish uchun
// oddiy harfma-harf transliteratsiya kifoya (aniq lingvistik qoida emas,
// shuning uchun keyin ikkala tomon ham normallashtiriladi: apostrof/qo'shimcha
// so'zlar olib tashlanadi, faqat harf-raqamlar solishtiriladi).
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '',
  э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

@Injectable()
export class TelegramImportService {
  private readonly logger = new Logger(TelegramImportService.name);
  private importUserId: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
    private readonly parser: TelegramParserService,
    private readonly geocoding: GeocodingService,
  ) {}

  // ───────────────────────── Kanallarni boshqarish ─────────────────────────

  async listChannels(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.telegramImportChannel.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.telegramImportChannel.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  addChannel(dto: AddChannelDto) {
    const username = dto.username.replace(/^@/, '').trim();
    return this.prisma.telegramImportChannel.create({
      data: {
        username,
        sinceDate: dto.sinceDate ? new Date(dto.sinceDate) : undefined,
        defaultDealType: dto.defaultDealType,
        defaultPropertyType: dto.defaultPropertyType,
      },
    });
  }

  async updateChannel(id: number, dto: UpdateChannelDto) {
    await this.getChannelOrThrow(id);
    return this.prisma.telegramImportChannel.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        sinceDate: dto.sinceDate ? new Date(dto.sinceDate) : undefined,
        defaultDealType: dto.defaultDealType,
        defaultPropertyType: dto.defaultPropertyType,
      },
    });
  }

  async deleteChannel(id: number) {
    await this.getChannelOrThrow(id);
    await this.prisma.telegramImportChannel.delete({ where: { id } });
    return { message: "Kanal kuzatishdan olib tashlandi" };
  }

  private async getChannelOrThrow(id: number) {
    const channel = await this.prisma.telegramImportChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Kanal topilmadi');
    return channel;
  }

  // ───────────────────────── Import jarayoni ─────────────────────────

  // Ko'p postli kanalda geocoding (har biri ~1 soniya kutish bilan) daqiqalab
  // cho'zilishi mumkin — HTTP so'rovni ochiq ushlab turmaslik uchun (aks holda
  // nginx 504 beradi) fonda ishga tushirib, darhol javob qaytaramiz. Natija
  // (nechta import qilingani) server logida va keyin
  // GET /real-estates?status=PENDING_REVIEW orqali ko'rinadi.
  async runBackfill(id: number) {
    const channel = await this.getChannelOrThrow(id);
    this.importFromChannel(channel, true).catch((e) =>
      this.logger.error(`"${channel.username}" backfill xatosi`, e as Error),
    );
    return { message: "Backfill fonda boshlandi — natijani bir ozdan keyin GET /real-estates?status=PENDING_REVIEW orqali tekshiring", channelId: id };
  }

  // Har 10 daqiqada faol kanallardagi YANGI postlarni import qiladi. Sotilgan/
  // o'chirilgan e'lonlarni tekshirish ATAYLAB yo'q — admin buni o'zi
  // `PATCH /real-estates/:id/status` orqali qo'lda belgilaydi.
  @Interval(10 * 60_000)
  async syncActiveChannels() {
    if (!this.telegramClient.isEnabled()) return;

    const channels = await this.prisma.telegramImportChannel.findMany({ where: { isActive: true } });
    for (const channel of channels) {
      await this.importFromChannel(channel, false).catch((e) =>
        this.logger.error(`"${channel.username}" sync xatosi`, e as Error),
      );
    }
  }

  private async importFromChannel(channel: TelegramImportChannel, isBackfill: boolean) {
    if (!this.telegramClient.isEnabled()) {
      this.logger.warn("Telegram ulanmagan — import bajarilmadi. scripts/telegram-login.ts orqali sozlang.");
      return { imported: 0, skipped: 0 };
    }

    const posts = isBackfill
      ? await this.telegramClient.fetchMessages(channel.username, { sinceDate: channel.sinceDate })
      : await this.telegramClient.fetchMessages(channel.username, { afterMessageId: channel.lastMessageId });

    const cities = await this.prisma.location.findMany({ where: { type: 'CITY' } });
    if (cities.length === 0) {
      this.logger.error("Bazada birorta ham shahar (Location) topilmadi — import to'xtatildi");
      return { imported: 0, skipped: posts.length };
    }
    const systemUserId = await this.getOrCreateImportUser();
    const cityCoordsCache = new Map<string, { latitude: number; longitude: number } | null>();

    let imported = 0;
    let skipped = 0;
    let maxMessageId = channel.lastMessageId ?? 0;

    for (const post of posts) {
      maxMessageId = Math.max(maxMessageId, post.maxId);
      const externalId = `telegram:${channel.username}:${post.id}`;

      const exists = await this.prisma.realEstate.findUnique({ where: { externalId } });
      if (exists) continue;

      const parsed = this.parser.parse(post.text);

      // Faqat narx/telefon borligi yetarli emas — turizm/reklama kabi ko'chmas
      // mulkka aloqasi yo'q postlarda ham shular bo'lishi mumkin (masalan
      // "tur — 558$, +998..."). Shuning uchun kamida bitta ko'chmas-mulkka XOS
      // tuzilgan maydon (xona/qavat/maydon/sotix) topilgan bo'lishi shart —
      // aks holda bu umuman e'lon emas deb hisoblab o'tkazib yuboramiz.
      // "kvartira kerak"/"sherik qidirilmoqda" kabi TALAB postlari ham (sotuvchi
      // emas, qidirayotgan odam yozgan) o'tkazib yuboriladi.
      const hasRealEstateSignal =
        parsed.roomCount !== null || parsed.floor !== null || parsed.areaSize !== null || parsed.plotSize !== null;
      if (parsed.isDemandPost || !hasRealEstateSignal || (parsed.price === null && parsed.contactPhone === null)) {
        skipped++;
        continue;
      }

      // Postdagi manzil matnidan (kirillcha bo'lsa ham) haqiqiy shaharni topishga
      // harakat qilamiz — topilmasa ro'yxatdagi birinchi shahar zaxira sifatida
      // ishlatiladi (lekin bu holat log'da alohida ko'rsatiladi, chunki noto'g'ri
      // shaharga yozilib qolishi mumkin — admin PENDING_REVIEW'da tekshirsin).
      const matchedCity = this.matchLocation(parsed.addressCandidate, cities);
      const resolvedCity = matchedCity ?? cities[0];
      if (!matchedCity) {
        this.logger.warn(`Manzil shahar bilan mos kelmadi ("${parsed.addressCandidate}") — zaxira sifatida "${resolvedCity.name}" qo'yildi`);
      }

      const { coords, coordsSource } = await this.resolveCoordinates(parsed, resolvedCity.name, cityCoordsCache);

      // Narx haqida ko'rsatiladigan izoh — m²-narx holatida batafsil tushuntirish,
      // aks holda parser topgan asl narx matni ("22 000 $" kabi), bo'lmasa yo'q.
      const priceDesc = parsed.priceIsPerSqm
        ? `Import: asl e'londa narx 1 m² uchun ko'rsatilgan (${parsed.pricePerSqm}$/m²)${parsed.areaSize ? ` — umumiy narx ${parsed.areaSize} m² ga ko'paytirib hisoblangan` : ''}. Tekshiring.`
        : (parsed.pricePrimaryText ?? undefined);

      // Rasmlarni RealEstate yaratilishidan OLDIN yuklaymiz — shunda nechta
      // rasm kelganini `syncStatus.parsedFields.importedImageCount`ga yozib
      // qo'yamiz (admin PENDING_REVIEW'da darhol ko'rishi uchun).
      const imageUrls = await this.downloadAndSaveImages(post.photoRefs);

      try {
        const realEstate = await this.prisma.realEstate.create({
          data: {
            title: parsed.title,
            description: this.buildDescription(parsed, channel, post.text),
            price: parsed.price ?? 0,
            priceDesc,
            propertyType: parsed.propertyType ?? channel.defaultPropertyType ?? PropertyType.APARTMENT,
            dealType: parsed.dealType ?? channel.defaultDealType ?? DealType.SALE,
            sellerType: SellerType.INDIVIDUAL,
            userId: systemUserId,
            locationId: resolvedCity.id,
            contactPhone: parsed.contactPhone ?? IMPORT_SYSTEM_USER_PHONE,
            areaSize: parsed.areaSize ?? 0,
            roomCount: parsed.roomCount ?? 1,
            floor: parsed.floor ?? undefined,
            plotSize: parsed.plotSize ?? undefined,
            address: parsed.addressCandidate,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            status: RealEstateStatus.PENDING_REVIEW,
            externalId,
            apiUrl: `https://t.me/${channel.username}/${post.id}`,
            syncStatus: {
              rawText: post.text,
              originalId: parsed.originalId,
              parsedFields: {
                price: parsed.price,
                pricePerSqm: parsed.pricePerSqm,
                priceIsPerSqm: parsed.priceIsPerSqm,
                roomCount: parsed.roomCount,
                areaSize: parsed.areaSize,
                plotSize: parsed.plotSize,
                floor: parsed.floor,
                dealType: parsed.dealType ?? channel.defaultDealType ?? null,
                propertyType: parsed.propertyType,
                importedImageCount: imageUrls.length,
              },
              locationMatched: !!matchedCity,
              resolvedCityName: resolvedCity.name,
              coordsSource,
              missingFields: parsed.missingFields,
              channel: channel.username,
              importedAt: new Date().toISOString(),
            },
          },
        });

        // Yuqorida yuklab olingan rasmlarni endi e'longa biriktiramiz.
        if (imageUrls.length > 0) {
          await this.prisma.propertyImgAndVideo.createMany({
            data: imageUrls.map((url, i) => ({ propertyId: realEstate.id, url, mediaType: MediaType.IMAGE, isMain: i === 0 })),
          });
        }

        imported++;
      } catch (e) {
        this.logger.warn(`Import xatosi (${externalId}): ${(e as Error).message}`);
        skipped++;
      }
    }

    await this.prisma.telegramImportChannel.update({ where: { id: channel.id }, data: { lastMessageId: maxMessageId } });
    this.logger.log(`"${channel.username}": ${imported} ta yangi e'lon import qilindi, ${skipped} ta o'tkazib yuborildi`);
    return { imported, skipped };
  }


  // Manzilni bir necha usulda, ketma-ket urinib geocode qiladi — eng aniqdan
  // eng taxminiyga qarab: (1) to'liq manzil (tuman+mo'ljal), (2) faqat mo'ljal
  // (bu ko'pincha mehmonxona/zavod kabi aniq nom bo'lgani uchun Nominatim'da
  // topilish ehtimoli yuqoriroq), (3) faqat tuman, (4-5) xuddi shularni Photon
  // bilan qayta urinish (boshqa qidiruv algoritmi — Nominatim topolmaganini
  // ba'zan topadi). MUHIM: har bir natija avval shahar markaziga solishtirilib
  // tekshiriladi — agar 40km dan uzoqda chiqsa (geocoding xato/aldangan bo'lsa),
  // o'sha natija RAD ETILADI. Hech biri to'g'ri chiqmasa — shahar markazi
  // (KAFOLATLANGAN, hech qachon bo'sh yoki noto'g'ri hududda qolmaydi).
  private async resolveCoordinates(
    parsed: ParsedListing,
    cityName: string,
    cityCoordsCache: Map<string, { latitude: number; longitude: number } | null>,
  ): Promise<{ coords: { latitude: number; longitude: number } | null; coordsSource: string | null }> {
    const MAX_DISTANCE_FROM_CITY_KM = 40;

    // Bir xil shahar butun backfill davomida qayta-qayta geocode qilinmasin —
    // ko'p e'lonli kanalda bu sezilarli tezlik yutug'i beradi (throttling tufayli
    // har bir geocoding so'rovi ~1 soniya oladi).
    let cityCoords = cityCoordsCache.get(cityName);
    if (cityCoords === undefined) {
      cityCoords = await this.geocoding.geocode(`${cityName}, O'zbekiston`);
      cityCoordsCache.set(cityName, cityCoords);
    }

    const attempts: { query: string; source: string; usePhoton?: boolean }[] = [];
    if (parsed.addressCandidate) attempts.push({ query: `${parsed.addressCandidate}, O'zbekiston`, source: 'address' });
    if (parsed.landmark) attempts.push({ query: `${parsed.landmark}, ${cityName}, O'zbekiston`, source: 'landmark' });
    if (parsed.district) attempts.push({ query: `${parsed.district}, O'zbekiston`, source: 'district' });
    if (parsed.addressCandidate) attempts.push({ query: `${parsed.addressCandidate}, Uzbekistan`, source: 'photon-address', usePhoton: true });
    if (parsed.landmark) attempts.push({ query: `${parsed.landmark}, ${cityName}, Uzbekistan`, source: 'photon-landmark', usePhoton: true });

    for (const attempt of attempts) {
      const coords = attempt.usePhoton
        ? await this.geocoding.geocodePhoton(attempt.query)
        : await this.geocoding.geocode(attempt.query);
      if (!coords) continue;

      if (cityCoords && haversineKm(coords, cityCoords) > MAX_DISTANCE_FROM_CITY_KM) {
        this.logger.warn(`"${attempt.query}" natijasi "${cityName}"dan juda uzoq chiqdi — rad etildi (ehtimol geocoding xatosi)`);
        continue;
      }
      return { coords, coordsSource: attempt.source };
    }

    return { coords: cityCoords, coordsSource: cityCoords ? 'city-fallback' : null };
  }

  // ───────────────────────── Rasmlarni yuklab olish ─────────────────────────

  // Postdagi har bir rasmni Telegram'dan yuklab, siqib (max 1600px, webp q76 —
  // mavjud `toOptimizedWebp`), `core/uploads/images`ga yozadi. Bitta rasm
  // muvaffaqiyatsiz bo'lsa ham (Telegram xatosi, buzuq fayl va h.k.) qolganlari
  // bilan davom etadi — natija bo'sh massiv bo'lishi ham mumkin, bu e'lonni
  // yaratishni to'xtatmaydi (admin keyin qo'lda rasm qo'sha oladi).
  private async downloadAndSaveImages(photoRefs: Api.Message[]): Promise<string[]> {
    if (photoRefs.length === 0) return [];

    const dir = join(process.cwd(), 'core', 'uploads', 'images');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const urls: string[] = [];
    for (const msg of photoRefs) {
      try {
        const buffer = await this.telegramClient.downloadPhoto(msg);
        if (!buffer) continue;
        const optimized = await toOptimizedWebp(buffer);
        const filename = `${Date.now()}-${urls.length}.webp`;
        await writeFile(join(dir, filename), optimized);
        urls.push(`image/${filename}`);
      } catch (e) {
        this.logger.warn(`Rasmni saqlab bo'lmadi: ${(e as Error).message}`);
      }
    }
    return urls;
  }

  // Frontenddagi generateDescriptionDraft() bilan bir xil uslubda — toza,
  // tuzilgan o'zbekcha matn yasaydi (xom Telegram post matni, kontakt-spam va
  // boshqa kanalga reklama qatorlari bilan emas). Xom matn faqat
  // syncStatus.rawText'da (admin tekshiruvi uchun) qoladi. Oxiriga
  // frontend kutgan DETAIL_MARKER + JSON qo'shiladi — shu tufayli tahrirlash
  // formasi buni xuddi o'zi yaratgan e'londek qayta o'qiy oladi.
  private buildDescription(parsed: ParsedListing, channel: TelegramImportChannel, rawText: string): string {
    const dealType = parsed.dealType ?? channel.defaultDealType ?? DealType.SALE;
    const propertyType = parsed.propertyType ?? channel.defaultPropertyType ?? PropertyType.APARTMENT;
    const dealText = dealType === DealType.RENT ? 'ijaraga beriladi' : 'sotiladi';
    const categoryText = PROPERTY_TYPE_LABEL[propertyType];

    const lines = [
      `${categoryText} ${dealText}.`,
      (parsed.district ?? parsed.addressCandidate) ? `Manzil: ${parsed.district ?? parsed.addressCandidate}.` : '',
      parsed.landmark ? `Mo'ljal: ${parsed.landmark}.` : '',
      parsed.roomCount ? `Xonalar soni: ${parsed.roomCount}.` : '',
      parsed.floor ? `Qavat: ${parsed.floor}.` : '',
      parsed.areaSize ? `Maydoni: ${parsed.areaSize} m².` : '',
      parsed.plotSize ? `Yer maydoni: ${parsed.plotSize} sotix.` : '',
      parsed.price
        ? parsed.priceIsPerSqm
          ? `Narxi: ${parsed.price.toLocaleString('uz-UZ')} $ (1 m² — ${parsed.pricePerSqm} $, avtomatik hisoblangan).`
          : `Narxi: ${parsed.price.toLocaleString('uz-UZ')} $.`
        : '',
      parsed.contactPhone ? `Telefon: ${parsed.contactPhone}.` : '',
      "Telegram kanalidan import qilingan — administrator tasdig'ini kutmoqda.",
    ].filter(Boolean);

    const cleanDescription = lines.join('\n');
    const details = { titleUz: parsed.title, descriptionUz: cleanDescription };
    return `${cleanDescription}\n\n${DETAIL_MARKER}\n${JSON.stringify(details)}`;
  }

  // ───────────────────────── Manzildan shahar topish ─────────────────────────

  private transliterate(text: string): string {
    return text
      .toLowerCase()
      .split('')
      .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
      .join('');
  }

  private normalizeLocationName(value: string): string {
    return this.transliterate(value)
      .replace(/['ʼ`’]/g, '')
      .replace(/\b(viloyati|shahri|tumani|tuman|shahar|shaxar|respublikasi|uzbekiston)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private matchLocation(addressCandidate: string | null, cities: { id: number; name: string }[]): { id: number; name: string } | null {
    if (!addressCandidate) return null;
    const normalizedAddress = this.normalizeLocationName(addressCandidate);
    if (!normalizedAddress) return null;

    return (
      cities.find((c) => {
        const normalizedCity = this.normalizeLocationName(c.name);
        return normalizedCity && normalizedAddress.includes(normalizedCity);
      }) ?? null
    );
  }

  private async getOrCreateImportUser(): Promise<number> {
    if (this.importUserId) return this.importUserId;

    let user = await this.prisma.user.findUnique({ where: { phone: IMPORT_SYSTEM_USER_PHONE } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: IMPORT_SYSTEM_USER_PHONE,
          firstName: 'Telegram',
          lastName: 'Import',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });
    }
    this.importUserId = user.id;
    return user.id;
  }
}
