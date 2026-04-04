import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SchemaCompatibilityService {
  private masterProfileSalaryTypeAvailable: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async hasMasterProfileSalaryType(): Promise<boolean> {
    if (this.masterProfileSalaryTypeAvailable !== null) {
      return this.masterProfileSalaryTypeAvailable;
    }

    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'master_profiles'
          AND column_name = 'salary_type'
      ) AS "exists"
    `;

    this.masterProfileSalaryTypeAvailable = Boolean(rows[0]?.exists);
    return this.masterProfileSalaryTypeAvailable;
  }
}
