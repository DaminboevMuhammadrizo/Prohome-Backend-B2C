import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: number;
  phone: string;
  role: UserRole;
};
