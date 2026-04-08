import { AuthRole } from '../config/jwt/jwt.service';

export type AuthUser = {
  id: number;
  phone: string;
  role: AuthRole;
  entityType: 'USER' | 'COMPANY';
  companyId?: number | null;
};
