import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// Nominatim (OpenStreetMap) orqali matn manzildan taxminiy lat/lng olish — bepul,
// kalit kerak emas (mobil ilova ham shu xizmatni ishlatadi). Foydalanish siyosati
// majburiy User-Agent va so'rovlar orasida kamida 1 soniya kutishni talab qiladi,
// shuning uchun ichki navbat orqali ketma-ket (parallel emas) so'raladi.
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

  async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!address?.trim()) return null;

    // Navbatga qo'yamiz — Nominatim'ga bir vaqtda bittadan so'rov ketishi shart
    const task = this.queue.then(() => this.doGeocode(address));
    this.queue = task.catch(() => null);
    return task as Promise<{ latitude: number; longitude: number } | null>;
  }

  private async doGeocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
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
      this.logger.warn(`Geocoding xatosi ("${address}"): ${(e as Error).message}`);
      return null;
    }
  }
}
