import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanyJwtPayload } from '../config/jwt/jwt.service';

@Injectable()
export class CompanyGuardService implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('Authorization header missing');

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Invalid token format');

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET', 'access_default_secret');
      const payload = await this.jwtService.verifyAsync<CompanyJwtPayload>(token, { secret });
      if (payload.type !== 'company') throw new UnauthorizedException('Company token required');
      request.company = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired company token');
    }
  }
}
