import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { MasterRegisterDto, OtpPurpose, RegisterAuthDto, ResetPasswordDto, SendOtpDto } from './dto/register.dto';
import { JwtPayload, JwtServices } from 'src/common/config/jwt/jwt.service';
import { hashPassword, compirePassword } from 'src/common/config/bcrypt';
import { RedisService } from 'src/common/config/redis/redis.service';
import { PrismaService } from 'src/common/database/prisma.service';
import { SmsService } from 'src/common/services/sms.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginOtpDto } from './dto/login.dto';
import { Login2Dto } from './dto/login2.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtServices,
        private readonly redis: RedisService,
        private readonly sms: SmsService,
    ) { }

    private otpKey(phone: string, purpose: OtpPurpose) {
        return `otp:${purpose}:${phone}`;
    }

    private normalizePhone(phone: string): string {
        let p = phone.replace(/\s+/g, '').trim();
        if (!p.startsWith('+')) p = '+' + p;
        return p;
    }

    private buildPayload(user: Pick<User, 'id' | 'phone' | 'email' | 'role'>): JwtPayload {
        return { id: user.id, phone: user.phone, email: user.email, role: user.role };
    }

    private sanitize(user: User) {
        const { password, ...safe } = user;
        return safe;
    }

    private async genTokens(user: User) {
        const payload = this.buildPayload(user);
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.generateAccessToken(payload),
            this.jwt.generateRefreshToken(payload),
        ]);
        return { user: this.sanitize(user), accessToken, refreshToken };
    }

    private ensureActive(user: User) {
        if (user.status === 'BLOCKED') throw new UnauthorizedException('Foydalanuvchi bloklangan');
        if (user.status === 'ARCHIVED') throw new UnauthorizedException('Foydalanuvchi arxivda');
    }

    async sendOtp(dto: SendOtpDto) {
        const phone = this.normalizePhone(dto.phone);

        if (dto.purpose === OtpPurpose.REGISTER) {
            const existing = await this.prisma.user.findUnique({ where: { phone } });
            if (existing) throw new BadRequestException('Bu telefon raqam band');
        } else {
            const user = await this.prisma.user.findUnique({ where: { phone } });
            if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
            this.ensureActive(user);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.redis.set(this.otpKey(phone, dto.purpose), otp, 120);

        const text =
            dto.purpose === OtpPurpose.RESET_PASSWORD
                ? `"PROHOME" platformasi: parolni tiklash uchun tasdiqlash kodi ${otp}. Kodni hech kimga bermang.`
                : `"PROHOME" platformasida ro'yxatdan o'tish uchun kod: ${otp}`;

        await this.sms.sendSMS(text, phone);
        return { message: 'OTP yuborildi' };
    }

    private async verifyOtp(phone: string, otp: string, purpose: OtpPurpose) {
        const saved = await this.redis.get(this.otpKey(phone, purpose));
        if (!saved) throw new NotFoundException('OTP topilmadi yoki muddati tugagan');
        if (saved !== otp) throw new UnauthorizedException('OTP noto\'g\'ri');
        await this.redis.del(this.otpKey(phone, purpose));
    }

    async register(dto: RegisterAuthDto) {
        if (!dto.phone && !dto.email) {
            throw new BadRequestException('Telefon yoki email kiritish shart');
        }

        if (dto.phone) {
            const phone = this.normalizePhone(dto.phone);
            if (!dto.otp) throw new BadRequestException('Telefon bilan ro\'yxatdan o\'tishda OTP kerak');
            await this.verifyOtp(phone, dto.otp, OtpPurpose.REGISTER);

            const exists = await this.prisma.user.findUnique({ where: { phone } });
            if (exists) throw new BadRequestException('Bu telefon raqam band');

            if (dto.locationId) {
                const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
                if (!loc) throw new NotFoundException('Joylashuv topilmadi');
            }

            const user = await this.prisma.user.create({
                data: {
                    phone,
                    email: dto.email,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    age: dto.age,
                    password: dto.password ? await hashPassword(dto.password) : undefined,
                    locationId: dto.locationId,
                },
            });

            return this.genTokens(user);
        }

        // Email bilan ro'yxat
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new BadRequestException('Bu email band');
        if (!dto.password) throw new BadRequestException('Email bilan ro\'yxatda parol kerak');

        if (dto.locationId) {
            const loc = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
            if (!loc) throw new NotFoundException('Joylashuv topilmadi');
        }

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                age: dto.age,
                password: await hashPassword(dto.password),
                locationId: dto.locationId,
            },
        });

        return this.genTokens(user);
    }

    async loginOtp(dto: LoginOtpDto) {
        const phone = this.normalizePhone(dto.phone);
        await this.verifyOtp(phone, dto.otp, OtpPurpose.LOGIN);

        const user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
        this.ensureActive(user);

        return this.genTokens(user);
    }

    async loginPassword(dto: Login2Dto) {
        if (!dto.phone && !dto.email) {
            throw new BadRequestException('Telefon yoki email kiritish shart');
        }

        let user: User | null = null;

        if (dto.phone) {
            const phone = this.normalizePhone(dto.phone);
            user = await this.prisma.user.findUnique({ where: { phone } });
        } else if (dto.email) {
            user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        }

        if (!user?.password) throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
        this.ensureActive(user);

        const valid = await compirePassword(dto.password, user.password);
        if (!valid) throw new UnauthorizedException('Login yoki parol noto\'g\'ri');

        return this.genTokens(user);
    }

    async resetPassword(dto: ResetPasswordDto) {
        const phone = this.normalizePhone(dto.phone);
        await this.verifyOtp(phone, dto.otp, OtpPurpose.RESET_PASSWORD);

        const user = await this.prisma.user.findUnique({ where: { phone } });
        if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
        this.ensureActive(user);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: await hashPassword(dto.password) },
        });

        return { message: 'Parol yangilandi' };
    }

    async refresh(dto: RefreshTokenDto) {
        try {
            const payload = await this.jwt.verifyRefreshToken(dto.refreshToken);
            const user = await this.prisma.user.findUnique({ where: { id: payload.id } });
            if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
            this.ensureActive(user);
            return this.genTokens(user);
        } catch {
            throw new UnauthorizedException("Refresh token noto'g'ri yoki eskirgan");
        }
    }

    async registerMaster(dto: MasterRegisterDto) {
        const phone = this.normalizePhone(dto.phone);
        await this.verifyOtp(phone, dto.otp, OtpPurpose.REGISTER);

        const existingUser = await this.prisma.user.findUnique({ where: { phone } });
        if (existingUser) throw new BadRequestException('Bu telefon raqam band');

        const skillType = await this.prisma.skillType.findUnique({ where: { id: dto.skillTypeId } });
        if (!skillType) throw new NotFoundException('Skill turi topilmadi');

        const skills = await this.prisma.skills.findMany({
            where: { id: { in: dto.skillIds }, typeId: dto.skillTypeId },
        });
        if (skills.length !== dto.skillIds.length) {
            throw new BadRequestException("Skill IDlar noto'g'ri yoki belgilangan skill turiga tegishli emas");
        }

        const user = await this.prisma.user.create({
            data: { phone, firstName: dto.firstName, lastName: dto.lastName, role: UserRole.MASTER },
        });

        const master = await this.prisma.master.create({
            data: { userId: user.id, experience: dto.experience },
        });

        await this.prisma.masterSkills.createMany({
            data: dto.skillIds.map((skillId) => ({ masterId: master.id, skillId })),
            skipDuplicates: true,
        });

        const tokens = await this.genTokens(user);
        return { ...tokens, masterId: master.id };
    }
}
