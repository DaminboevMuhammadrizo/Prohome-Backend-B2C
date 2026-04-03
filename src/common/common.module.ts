import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "./database/prisma.module";
import { GuardModule } from "./guard/guard.module";
import { RoleGuardModule } from "./role_guard/role_guard.module";
import { CoreModule } from "./core/core.module";
import { ConfigModule } from "./config/config.module";
import { InteractionBufferModule } from "./interactions/interaction-buffer.module";
import { PhoneIdentityService } from "./services/phone-identity.service";
import { SeaderModule } from "./seeders/seader.module";

@Global()
@Module({
    imports: [PrismaModule,GuardModule,RoleGuardModule,CoreModule,ConfigModule,InteractionBufferModule,SeaderModule],
    providers: [PhoneIdentityService],
    controllers: [],
    exports: [PhoneIdentityService]
})
export class CommonModule { }
