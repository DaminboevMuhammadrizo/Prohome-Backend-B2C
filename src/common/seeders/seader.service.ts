import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { hashPassword } from "../config/bcrypt";
import { UserRole } from "@prisma/client";

@Injectable()
export class SeederService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedMinimal();
    }

    async seedMinimal() {
        const companyData = {
            name: "ProHome",
            phoneNumber: "+998901234567",
            managerName: "Super Admin",
            description: "Default company",
            status: true,
        };

        const adminData = {
            email: "superAdmin@gmail.com",
            password: "superAdmin123",
            fullName: "Omadbek",
            role: UserRole.SUPERADMIN,
        };

        await this.prisma.$transaction(
            async (tx) => {
                // 1) Permission (minimal kerak bo‘lsa)
                let permission = await tx.permission.findFirst({
                    where: { CRM: true, PROHOME: true },
                });

                if (!permission) {
                    permission = await tx.permission.create({
                        data: { CRM: true, PROHOME: true },
                    });
                }

                // 2) Company
                const company = await tx.company.upsert({
                    where: { name: companyData.name },
                    update: {
                        phoneNumber: companyData.phoneNumber,
                        managerName: companyData.managerName,
                        description: companyData.description,
                        status: companyData.status,
                        permissionId: permission.id,
                    },
                    create: {
                        ...companyData,
                        permissionId: permission.id,
                    },
                });


                // 5) SuperAdmin User
                const passwordHash = await hashPassword(adminData.password);

                await tx.user.upsert({
                    where: { email: adminData.email },
                    update: {
                        companyId: company.id,
                        permissionId: permission.id,
                        role: adminData.role,
                        fullName: adminData.fullName,
                        password: passwordHash,
                    },
                    create: {
                        companyId: company.id,
                        permissionId: permission.id,
                        email: adminData.email,
                        password: passwordHash,
                        role: adminData.role,
                        fullName: adminData.fullName,
                    },
                });

                console.table({
                    company: company.name,
                    admin: adminData.email,
                });
            },
            { timeout: 50000 }
        );
    }
}