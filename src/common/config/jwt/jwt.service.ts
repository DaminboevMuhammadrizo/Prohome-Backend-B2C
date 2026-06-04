import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

export type JwtPayload = {
  id: number;
  phone?: string | null;
  email?: string | null;
  role: UserRole;
};

export type CompanyJwtPayload = {
  companyId: number;
  name: string;
  type: 'company';
};

@Injectable()
export class JwtServices {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private signToken(
    payload: JwtPayload,
    secretKey: string,
    expiresIn: JwtSignOptions['expiresIn'],
  ): Promise<string> {
    return this.jwt.signAsync(payload, { secret: secretKey, expiresIn });
  }

  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_ACCESS_TOKEN_SECRET', 'access_default_secret');
    const expiresIn = this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '12d') as JwtSignOptions['expiresIn'];
    return this.signToken(payload, secret, expiresIn);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_REFRESH_TOKEN_SECRET', 'refresh_default_secret');
    const expiresIn = this.config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '32d') as JwtSignOptions['expiresIn'];
    return this.signToken(payload, secret, expiresIn);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.config.get<string>('JWT_REFRESH_TOKEN_SECRET', 'refresh_default_secret');
    return this.jwt.verifyAsync<JwtPayload>(token, { secret });
  }

  async generateCompanyAccessToken(payload: CompanyJwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_ACCESS_TOKEN_SECRET', 'access_default_secret');
    const expiresIn = this.config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '12d') as JwtSignOptions['expiresIn'];
    return this.jwt.signAsync(payload, { secret, expiresIn });
  }

  async verifyAccessToken(token: string): Promise<JwtPayload | CompanyJwtPayload> {
    const secret = this.config.get<string>('JWT_ACCESS_TOKEN_SECRET', 'access_default_secret');
    return this.jwt.verifyAsync(token, { secret });
  }
}
