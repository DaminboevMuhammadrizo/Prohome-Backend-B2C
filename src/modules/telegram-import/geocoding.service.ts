import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export type Coordinates = { latitude: number; longitude: number };

// Ikkita bepul (kalitsiz) geocoding xizmatidan foydalanadi:
//   1) Nominatim (OpenStreetMap) — asosiy, ko'p manzillar uchun yetarli
//   2) Photon (Komoot, OSM asosida, lekin qidiruv algoritmi boshqacha) —
//      Nominatim topolmagan mo'ljal/POI'larda ko'pincha muvaffaqiyatli bo'ladi
// Ikkalasi ham foydalanish siyosati talab qiladigan User-Agent va so'rovlar
// orasidagi kutish bilan, ichki navbat orqali ketma-ket so'raladi.
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequestAt = 0;

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < 1100) await new Promise((r) => setTimeout(r, 1100 - elapsed));
    this.lastRequestAt = Date.now();
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => null);
    return result;
  }

  async geocode(address: string): Promise<Coordinates | null> {
    if (!address?.trim()) return null;
    return this.enqueue(() => this.doGeocodeNominatim(address));
  }

  async geocodePhoton(address: string): Promise<Coordinates | null> {
    if (!address?.trim()) return null;
    return this.enqueue(() => this.doGeocodePhoton(address));
  }

  private async doGeocodeNominatim(address: string): Promise<Coordinates | null> {
    await this.throttle();
    try {
      const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: address, format: 'json', limit: 1, countrycodes: 'uz' },
        headers: { 'User-Agent': 'ProhomeBackend/1.0 (contact: admin@prohome.uz)' },
        timeout: 10_000,
      });

      if (!Array.isArray(data) || data.length === 0) return null;
      const { lat, lon } = data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } catch (e) {
      this.logger.warn(`Nominatim xatosi ("${address}"): ${(e as Error).message}`);
      return null;
    }
  }

  private async doGeocodePhoton(address: string): Promise<Coordinates | null> {
    await this.throttle();
    try {
      const { data } = await axios.get('https://photon.komoot.io/api/', {
        params: { q: address, limit: 1, lang: 'en' },
        headers: { 'User-Agent': 'ProhomeBackend/1.0 (contact: admin@prohome.uz)' },
        timeout: 10_000,
      });

      const feature = data?.features?.[0];
      const coords = feature?.geometry?.coordinates; // GeoJSON: [lon, lat]
      if (!Array.isArray(coords) || coords.length < 2) return null;
      return { latitude: coords[1], longitude: coords[0] };
    } catch (e) {
      this.logger.warn(`Photon xatosi ("${address}"): ${(e as Error).message}`);
      return null;
    }
  }
}
