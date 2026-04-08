import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../types/auth-user.type';

export function isPrivilegedRole(role: AuthUser['role']): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPERADMIN;
}

export function assertAdmin(user: AuthUser): void {
  if (!isPrivilegedRole(user.role)) {
    throw new ForbiddenException('Sizda bu amal uchun ruxsat yo‘q');
  }
}

export function assertOwnership(
  ownerId: number,
  user: AuthUser,
  message = 'Siz faqat o‘zingizga tegishli ma‘lumotni boshqara olasiz',
): void {
  if (!isPrivilegedRole(user.role) && ownerId !== user.id) {
    throw new ForbiddenException(message);
  }
}

export function assertCompanyAccess(
  companyId: number,
  user: AuthUser,
  message = 'Siz bu companyni boshqara olmaysiz',
): void {
  if (isPrivilegedRole(user.role)) {
    return;
  }

  if (user.entityType === 'COMPANY') {
    if (user.companyId !== companyId) {
      throw new ForbiddenException(message);
    }
    return;
  }

  throw new ForbiddenException(message);
}

export function ensureFound<T>(
  value: T | null,
  message: string,
): T {
  if (!value) {
    throw new NotFoundException(message);
  }

  return value;
}
