import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./database/prisma.module";
import { GuardModule } from "./guard/guard.module";
import { RoleGuardModule } from "./role_guard/role_guard.module";
import { CoreModule } from "./core/core.module";
import { ConfigModule } from "./config/config.module";
import { InteractionBufferModule } from "./interactions/interaction-buffer.module";
import { PhoneIdentityService } from "./services/phone-identity.service";
import { SchemaCompatibilityService } from "./services/schema-compatibility.service";
import { SeaderModule } from "./seeders/seader.module";
import { TelegramBotService } from "./services/telegram-bot.service";
import { DataAccessAuditService } from "./services/data-access-audit.service";
import { BackupService } from "./services/backup.service";

@Global()
@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        GuardModule,
        RoleGuardModule,
        CoreModule,
        ConfigModule,
        InteractionBufferModule,
        SeaderModule,
    ],
    providers: [
        PhoneIdentityService,
        SchemaCompatibilityService,
        TelegramBotService,
        DataAccessAuditService,
        BackupService,
    ],
    controllers: [],
    exports: [
        PhoneIdentityService,
        SchemaCompatibilityService,
        TelegramBotService,
        DataAccessAuditService,
        BackupService,
    ]
})
export class CommonModule { }
