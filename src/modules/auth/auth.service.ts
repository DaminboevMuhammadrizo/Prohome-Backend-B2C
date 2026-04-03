import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Company, User, UserRole } from '@prisma/client';
import { hashPassword, compirePassword } from 'src/common/config/bcrypt';
import { JwtPayload, JwtServices } from 'src/common/config/jwt/jwt.service';
import { RedisService } from 'src/common/config/redis/redis.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { PhoneIdentityService } from 'src/common/services/phone-identity.service';
import { SmsService } from 'src/common/services/sms.service';
import { LoginAuthDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpPurpose, RegisterAuthDto, SendOtpDto } from './dto/register.dto';

type CompanyWithOwner = Company & {
  owner: Pick<User, 'id' | 'role' | 'isBlocked' | 'isArchived'>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtServices,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly phoneIdentityService: PhoneIdentityService,
  ) {}

  private getOtpKey(phone: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${phone}`;
  }

  private buildUserPayload(user: Pick<User, 'id' | 'phone' | 'role'>): JwtPayload {
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      entityType: 'USER',
      companyId: null,
    };
  }

  private buildCompanyPayload(company: CompanyWithOwner): JwtPayload {
    return {
      id: company.owner.id,
      phone: company.phone,
      role: company.owner.role ?? UserRole.USER,
      entityType: 'COMPANY',
      companyId: company.id,
    };
  }

  private sanitizeUser(user: User) {
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private sanitizeCompany(company: CompanyWithOwner) {
    const { password, owner, ...safeCompany } = company;
    return {
      ...safeCompany,
      owner,
    };
  }

  private async generateUserAuthResponse(user: User) {
    const payload = this.buildUserPayload(user);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.generateAccessToken(payload),
      this.jwt.generateRefreshToken(payload),
    ]);

    return {
      entityType: 'USER' as const,
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async generateCompanyAuthResponse(company: CompanyWithOwner) {
    const payload = this.buildCompanyPayload(company);
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.generateAccessToken(payload),
      this.jwt.generateRefreshToken(payload),
    ]);

    return {
      entityType: 'COMPANY' as const,
      company: this.sanitizeCompany(company),
      accessToken,
      refreshToken,
    };
  }

  private async findCompanyForLogin(phone: string): Promise<CompanyWithOwner | null> {
    return this.prisma.company.findUnique({
      where: { phone },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
            isBlocked: true,
            isArchived: true,
          },
        },
      },
    });
  }

  private ensureCompanyCanLogin(company: CompanyWithOwner) {
    if (!company.isActive) {
      throw new UnauthorizedException('Company faol emas');
    }

    if (company.owner.isBlocked) {
      throw new UnauthorizedException('Company owner block qilingan');
    }

    if (company.owner.isArchived) {
      throw new UnauthorizedException('Company owner arxivda');
    }
  }

  private ensureUserCanLogin(user: User) {
    if (user.isBlocked) {
      throw new UnauthorizedException('Foydalanuvchi block qilingan');
    }

    if (user.isArchived) {
      throw new UnauthorizedException('Foydalanuvchi arxivda');
    }
  }

  async sendOtp(dto: SendOtpDto) {
    const phone = this.phoneIdentityService.normalizePhone(dto.phone);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redis.set(this.getOtpKey(phone, dto.purpose), otp, 120);
    await this.sms.sendSMS(
      `"PROHOME" platformasida ro'yxatdan o'tish uchun kod: ${otp}`,
      phone,
    );

    return { message: 'OTP yuborildi' };
  }

  private async verifyOtp(phone: string, otp: string, purpose: OtpPurpose) {
    const savedOtp = await this.redis.get(this.getOtpKey(phone, purpose));

    if (!savedOtp) {
      throw new NotFoundException('OTP topilmadi yoki muddati tugagan');
    }

    if (savedOtp !== otp) {
      throw new UnauthorizedException('OTP notogri');
    }

    await this.redis.del(this.getOtpKey(phone, purpose));
  }

  async register(dto: RegisterAuthDto) {
    const phone = this.phoneIdentityService.normalizePhone(dto.phone);
    await this.verifyOtp(phone, dto.otp, OtpPurpose.REGISTER);
    await this.phoneIdentityService.ensurePhoneAvailable({ phone });

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });

      if (!region) {
        throw new NotFoundException('Region topilmadi');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: await hashPassword(dto.password),
        regionId: dto.regionId,
      },
    });

    return this.generateUserAuthResponse(user);
  }

  async login(dto: LoginAuthDto) {
    const phone = this.phoneIdentityService.normalizePhone(dto.phone);
    await this.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

    const company = await this.findCompanyForLogin(phone);
    if (company) {
      this.ensureCompanyCanLogin(company);
      return this.generateCompanyAuthResponse(company);
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException('Company yoki foydalanuvchi topilmadi');
    }

    this.ensureUserCanLogin(user);
    return this.generateUserAuthResponse(user);
  }

  async login2(dto: Login2Dto) {
    const phone = this.phoneIdentityService.normalizePhone(dto.phone);

    const company = await this.findCompanyForLogin(phone);
    if (company?.password) {
      this.ensureCompanyCanLogin(company);
      const validCompanyPassword = await compirePassword(
        dto.password,
        company.password,
      );

      if (validCompanyPassword) {
        return this.generateCompanyAuthResponse(company);
      }
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user?.password) {
      throw new UnauthorizedException('Notogri login yoki parol');
    }

    this.ensureUserCanLogin(user);
    const isValidPassword = await compirePassword(dto.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Notogri login yoki parol');
    }

    return this.generateUserAuthResponse(user);
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwt.verifyRefreshToken(dto.refreshToken);

      if (payload.entityType === 'COMPANY' && payload.companyId) {
        const company = await this.findCompanyForLogin(payload.phone);

        if (!company || company.id !== payload.companyId) {
          throw new NotFoundException('Company topilmadi');
        }

        this.ensureCompanyCanLogin(company);
        return this.generateCompanyAuthResponse(company);
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        throw new NotFoundException('Foydalanuvchi topilmadi');
      }

      this.ensureUserCanLogin(user);
      return this.generateUserAuthResponse(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new UnauthorizedException('Refresh token notogri yoki eskirgan');
    }
  }
}
