import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { hashPassword, compirePassword } from 'src/common/config/bcrypt';
import { JwtPayload, JwtServices } from 'src/common/config/jwt/jwt.service';
import { RedisService } from 'src/common/config/redis/redis.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { SmsService } from 'src/common/services/sms.service';
import { LoginAuthDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpPurpose, RegisterAuthDto, SendOtpDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtServices,
        private readonly redis: RedisService,
        private readonly sms: SmsService,
    ) { }

    private normalizePhone(phone: string): string {
        const trimmed = phone.replace(/\s+/g, '');

        if (!trimmed.startsWith('+') && !/^\d+$/.test(trimmed)) {
            throw new BadRequestException('Telefon raqami notogri formatda');
        }

        return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
    }

    private getOtpKey(phone: string, purpose: OtpPurpose): string {
        return `otp:${purpose}:${phone}`;
    }

    private buildPayload(user: Pick<User, 'id' | 'phone' | 'role'>): JwtPayload {
        return {
            id: user.id,
            phone: user.phone,
            role: user.role,
        };
    }

    private sanitizeUser(user: User) {
        const { password, ...safeUser } = user;
        return safeUser;
    }

    private async generateAuthResponse(user: User) {
        const payload = this.buildPayload(user);
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.generateAccessToken(payload),
            this.jwt.generateRefreshToken(payload),
        ]);

        return {
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }

    async sendOtp(dto: SendOtpDto) {
        const phone = this.normalizePhone(dto.phone);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.redis.set(this.getOtpKey(phone, dto.purpose), otp, 120);
        await this.sms.sendSMS(`"PROHOME" platformasida ro'yxatdan o'tish uchun kod: ${otp}`, phone);

        return { message: 'OTP yuborildi' };
    }

    private async verifyOtp(phone: string, otp: string, purpose: OtpPurpose) {
        const savedOtp = await this.redis.get(this.getOtpKey(phone, purpose));

        if (!savedOtp) {
            throw new NotFoundException('OTP topilmadi yoki muddati tugagan');
        }

        if (savedOtp !== otp) {
            throw new BadRequestException('OTP notogri');
        }

        await this.redis.del(this.getOtpKey(phone, purpose));
    }

    async register(dto: RegisterAuthDto) {
        const phone = this.normalizePhone(dto.phone);
        await this.verifyOtp(phone, dto.otp, OtpPurpose.REGISTER);

        const existingUser = await this.prisma.user.findUnique({
            where: { phone },
        });

        if (existingUser) {
            throw new ConflictException('Bu telefon raqam bilan foydalanuvchi mavjud');
        }

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

        return this.generateAuthResponse(user);
    }

    async login(dto: LoginAuthDto) {
        const phone = this.normalizePhone(dto.phone);
        await this.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

        const user = await this.prisma.user.findUnique({
            where: { phone },
        });

        if (!user) {
            throw new NotFoundException('Foydalanuvchi topilmadi');
        }

        return this.generateAuthResponse(user);
    }

    async login2(dto: Login2Dto) {
        const phone = this.normalizePhone(dto.phone);
        const user = await this.prisma.user.findUnique({
            where: { phone },
        });

        if (!user?.password) {
            throw new UnauthorizedException('Notogri login yoki parol');
        }

        const isValidPassword = await compirePassword(dto.password, user.password);

        if (!isValidPassword) {
            throw new UnauthorizedException('Notogri login yoki parol');
        }

        return this.generateAuthResponse(user);
    }

    async refresh(dto: RefreshTokenDto) {
        try {
            const payload = await this.jwt.verifyRefreshToken(dto.refreshToken);
            const user = await this.prisma.user.findUnique({
                where: { id: payload.id },
            });

            if (!user) {
                throw new NotFoundException('Foydalanuvchi topilmadi');
            }

            return this.generateAuthResponse(user);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new UnauthorizedException('Refresh token notogri yoki eskirgan');
        }
    }
}
