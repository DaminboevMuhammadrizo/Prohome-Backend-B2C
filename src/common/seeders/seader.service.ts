import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { hashPassword } from "../config/bcrypt";
import { UserRole, UserStatus, Gender } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SeederService implements OnModuleInit {
    private readonly logger = new Logger(SeederService.name);

    constructor(private prisma: PrismaService, private configService: ConfigService) { }

    async onModuleInit() {
        await this.seedMinimal();
    }

    async seedMinimal() {
        await this.createAdmin();
    }

    private async createAdmin() {
        try {
            const adminPhone = this.configService.get<string>('ADMIN_PHONE');
            const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

            if (!adminPhone || !adminPassword) {
                this.logger.warn('⚠️ ADMIN_PHONE or ADMIN_PASSWORD not found in .env, skipping admin creation');
                return;
            }

            const existingAdmin = await this.prisma.user.findUnique({ where: { phone: adminPhone } });

            if (existingAdmin) {
                this.logger.log('✅ Admin already exists');
                return;
            }

            const hashedPassword = await hashPassword(adminPassword);

            const admin = await this.prisma.user.create({
                data: {
                    firstName: "Admin",
                    lastName: null,
                    age: null,
                    gender: Gender.MALE,
                    phone: adminPhone,
                    email: null,
                    regionId: null,
                    role: UserRole.ADMIN,
                    status: UserStatus.ACTIVE,
                    password: hashedPassword
                }
            });

            this.logger.log(`✅ Admin created successfully: ${admin.firstName} (ID: ${admin.id})`);

        } catch (error) {
            this.logger.error('❌ Failed to create admin:', error);
            throw error;
        }
    }
}
