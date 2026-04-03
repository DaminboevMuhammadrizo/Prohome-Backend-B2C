import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: number;
  phone: string;
  role: UserRole;
  entityType: 'USER' | 'COMPANY';
  companyId?: number | null;
};
