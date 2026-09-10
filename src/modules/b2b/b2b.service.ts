import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class B2bService {
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.config.get<string>('B2B_BASE_URL', 'http://localhost:3000');
  }

  private async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      const { data } = await axios.get<T>(`${this.baseUrl}${path}`, {
        params,
        timeout: 10000,
        headers: { 'X-B2C-KEY': this.config.get<string>('B2B_API_KEY', '') },
      });
      return data;
    } catch (err: any) {
      throw new InternalServerErrorException(
        err?.response?.data?.message ?? 'B2B backend bilan aloqa uzildi',
      );
    }
  }

  // ── Ko'rinish (visibility) overlay ─────────────────────────────────────────

  // isActive=false qilib belgilangan B2B kompaniya id'lari to'plami.
  // Yozuv umuman bo'lmasa — kompaniya KO'RINADI (default), shuning uchun bu
  // yerda faqat "yashirilganlar" qaytadi.
  private async hiddenCompanyIds(): Promise<Set<number>> {
    const rows = await this.prisma.b2bCompanyVisibility.findMany({
      where: { isActive: false },
      select: { b2bCompanyId: true },
    });
    return new Set(rows.map((r) => r.b2bCompanyId));
  }

  // ── Public (oddiy foydalanuvchi) — yashirilgan kompaniyalar filtrlab tashlanadi ──

  async getProjects() {
    const [projects, hidden] = await Promise.all([
      this.get<any[]>('/room/b2c/projects'),
      this.hiddenCompanyIds(),
    ]);
    if (!Array.isArray(projects)) return projects;
    return projects.filter((p) => !hidden.has(p?.companyId));
  }

  async getRooms(query: Record<string, any>) {
    const [res, hidden] = await Promise.all([
      this.get<any>('/room/b2c/rooms', query),
      this.hiddenCompanyIds(),
    ]);
    // Javob { data: [...] } ko'rinishida — data ichidan yashirilgan kompaniya
    // xonalarini olib tashlaymiz, qolgan kalitlar (meta va h.k.) tegilmaydi.
    if (res && Array.isArray(res.data)) {
      return { ...res, data: res.data.filter((r: any) => !hidden.has(r?.company?.id)) };
    }
    if (Array.isArray(res)) return res.filter((r: any) => !hidden.has(r?.company?.id));
    return res;
  }

  async getRoomDetail(id?: number, roomNumber?: string) {
    const res = await this.get<any>('/room/b2c/room-detail', { id, roomNumber });
    const companyId =
      res?.data?.floor?.dom?.bloc?.project?.companyId ?? res?.data?.company?.id ?? null;
    if (companyId !== null) {
      const hidden = await this.hiddenCompanyIds();
      if (hidden.has(companyId)) throw new NotFoundException('Xona topilmadi');
    }
    return res;
  }

  // company modulida ishlatiladi (o'zgarmagan)
  getCompanies() {
    return this.get<any[]>('/company/b2c');
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  // Barcha B2B kompaniyalar + har biriga local `isActive` (overlay) qo'shilgan.
  // Overlay yozuvi bo'lmasa isActive=true (default ko'rinadi).
  async adminListCompanies() {
    const [companies, overlays] = await Promise.all([
      this.get<any[]>('/company/b2c'),
      this.prisma.b2bCompanyVisibility.findMany(),
    ]);
    const byId = new Map(overlays.map((o) => [o.b2bCompanyId, o]));
    return (Array.isArray(companies) ? companies : []).map((c) => ({
      ...c,
      isActive: byId.get(c.id)?.isActive ?? true,
      visibilityOverridden: byId.has(c.id),
    }));
  }

  // Bitta B2B kompaniyaning ko'rinishini yoqish/o'chirish (upsert).
  async adminSetCompanyStatus(b2bCompanyId: number, isActive: boolean) {
    // Nom nusxasini (admin ro'yxatida ko'rsatish uchun) tashqi backenddan olishga urinamiz
    let name: string | undefined;
    try {
      const companies = await this.get<any[]>('/company/b2c');
      name = companies?.find((c) => c.id === b2bCompanyId)?.name;
    } catch {
      /* nomi bo'lmasa ham status saqlanaveradi */
    }

    const row = await this.prisma.b2bCompanyVisibility.upsert({
      where: { b2bCompanyId },
      update: { isActive, name },
      create: { b2bCompanyId, isActive, name },
    });
    return { b2bCompanyId: row.b2bCompanyId, name: row.name, isActive: row.isActive };
  }

  // Admin uchun — BARCHA loyihalar (yashirilganlari ham), har biriga kompaniya
  // holati va nomi qo'shilgan holda. Admin shu ro'yxatdan turib statusni
  // o'zgartiradi (PATCH /b2b/admin/companies/:id/status).
  async adminListProjects() {
    const [projects, companies, overlays] = await Promise.all([
      this.get<any[]>('/room/b2c/projects'),
      this.get<any[]>('/company/b2c').catch(() => [] as any[]),
      this.prisma.b2bCompanyVisibility.findMany(),
    ]);
    const nameById = new Map((companies ?? []).map((c: any) => [c.id, c.name]));
    const activeById = new Map(overlays.map((o) => [o.b2bCompanyId, o.isActive]));
    return (Array.isArray(projects) ? projects : []).map((p) => ({
      ...p,
      companyName: nameById.get(p?.companyId) ?? null,
      companyActive: activeById.get(p?.companyId) ?? true,
    }));
  }
}
