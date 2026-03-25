import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/common/database/prisma.service';
import { JwtServices } from 'src/common/config/jwt/jwt.service';
import { Gender, UserRole, UserStatus } from '@prisma/client';
import { RegisterAuthDto, SendOtpDto } from './dto/register.dto';
import { RedisService } from 'src/common/config/redis/redis.service';
import { SmsService } from 'src/common/services/sms.service';
import { LoginAuthDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtServices,
        private redis: RedisService,
        private sms: SmsService
    ) { }

    async sendPaymentReminder(phone: string, days: number) {
        const message = `Assalomu alaykum! China City loyihasidan xarid qilgan xonadoningiz bo'yicha navbatdagi to'lov muddati yaqinlashmoqda To'lov sanasigacha ${days} kun qoldi Wenny Estate`;

        return await this.sms.sendSMS(message, phone);
    }


    async sendBookingInfo(phone: string) {
        const message = `Assalomu alaykum! China City'dan tanlagan xonadoningiz bron qilindi. Bron 3 kun amal qiladi. Shu vaqt ichida shartnoma tuzib, aksiya va bonuslardan foydalaning.`;

        return await this.sms.sendSMS(message, phone);
    }

    async sendOtp(dto: SendOtpDto) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.redis.set(`register-otp:${dto.phone}`, otp, 120);

        const messages = {
            uz: `ProHome: Tasdiqlash kodi: ${otp}. Kodni hech kimga bermang!`,
            ru: `ProHome: Код подтверждения: ${otp}. Никому не сообщайте код!`,
            en: `ProHome: Verification code: ${otp}. Never share this code!`,
        };

        await this.sms.sendSMS(messages[dto.lang], dto.phone);

        return { message: 'OTP yuborildi' };
    }

    async register(payload: RegisterAuthDto) {
        await this.verifyOtp(payload.phone, payload.otp);

        const existsUser = await this.prisma.user.findUnique({
            where: { phone: payload.phone },
        });

        if (existsUser) {
            return this.generateTokens(existsUser);
        }

        const user = await this.prisma.user.create({
            data: {
                phone: payload.phone,
                role: payload.role,
                status: UserStatus.ACTIVE,
            },
        });

        return this.generateTokens(user);
    }

    async login(payload: LoginAuthDto) {
        await this.verifyOtp(payload.phone, payload.otp);

        const user = await this.prisma.user.findUnique({
            where: { phone: payload.phone },
        });

        if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

        return this.generateTokens(user);
    }

    private async verifyOtp(phone: string, otp: string) {
        const savedOtp = await this.redis.get(`register-otp:${phone}`);
        if (!savedOtp) {
            throw new NotFoundException('OTP topilmadi yoki muddati tugagan');
        }

        if (savedOtp !== otp) {
            throw new BadRequestException('OTP noto\'g\'ri');
        }

        await this.redis.del(`register-otp:${phone}`);

    }

    private async generateTokens(user: any) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.generateAccessToken(user),
            this.jwt.generateRefreshToken(user),
        ]);

        return { safeUser: user, accessToken, refreshToken };
    }
}
