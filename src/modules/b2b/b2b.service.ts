import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class B2bService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
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

  getProjects() {
    return this.get('/room/b2c/projects');
  }

  getRooms(query: Record<string, any>) {
    return this.get('/room/b2c/rooms', query);
  }

  getRoomDetail(id?: number, roomNumber?: string) {
    return this.get('/room/b2c/room-detail', { id, roomNumber });
  }

  getCompanies() {
    return this.get<any[]>('/company/b2c');
  }
}
