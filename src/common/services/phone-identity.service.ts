import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PhoneIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePhone(phone: string): string {
    const trimmed = phone.replace(/\s+/g, '');

    if (!trimmed.startsWith('+') && !/^\d+$/.test(trimmed)) {
      throw new BadRequestException('Telefon raqami notogri formatda');
    }

    return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
  }

  async ensurePhoneAvailable(params: {
    phone: string;
    excludeUserId?: number;
    excludeCompanyId?: number;
  }): Promise<string> {
    const normalizedPhone = this.normalizePhone(params.phone);

    const [user, company] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: params.excludeUserId ? { id: params.excludeUserId } : undefined,
        },
      }),
      this.prisma.company.findFirst({
        where: {
          phone: normalizedPhone,
          NOT: params.excludeCompanyId
            ? { id: params.excludeCompanyId }
            : undefined,
        },
      }),
    ]);

    if (user || company) {
      throw new ConflictException(
        'Bu telefon raqam user yoki company uchun allaqachon band',
      );
    }

    return normalizedPhone;
  }
}
