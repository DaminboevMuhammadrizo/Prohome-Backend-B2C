import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

export type JwtPayload = {
  id: number;
  phone: string;
  role: UserRole;
  entityType: 'USER' | 'COMPANY';
  companyId?: number | null;
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
    const secret = this.config.get<string>(
      'JWT_ACCESS_TOKEN_SECRET',
      'access_default_secret',
    );
    const expiresIn = this.config.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
      '15m',
    ) as JwtSignOptions['expiresIn'];

    return this.signToken(payload, secret, expiresIn);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>(
      'JWT_REFRESH_TOKEN_SECRET',
      'refresh_default_secret',
    );
    const expiresIn = this.config.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
      '7d',
    ) as JwtSignOptions['expiresIn'];

    return this.signToken(payload, secret, expiresIn);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.config.get<string>(
      'JWT_REFRESH_TOKEN_SECRET',
      'refresh_default_secret',
    );

    return this.jwt.verifyAsync<JwtPayload>(token, { secret });
  }
}
