import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./database/prisma.module";
import { GuardModule } from "./guard/guard.module";
import { RoleGuardModule } from "./role_guard/role_guard.module";
import { CoreModule } from "./core/core.module";
import { ConfigModule } from "./config/config.module";
import { SeaderModule } from "./seeders/seader.module";

@Global()
@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        GuardModule,
        RoleGuardModule,
        CoreModule,
        ConfigModule,
        SeaderModule,
    ],
    providers: [],
    controllers: [],
    exports: [],
})
export class CommonModule {}
