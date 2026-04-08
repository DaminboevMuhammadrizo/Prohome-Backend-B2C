import { Global, Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './core/core.module';
import { PrismaModule } from './database/prisma.module';
import { GuardModule } from './guard/guard.module';
import { InteractionBufferModule } from './interactions/interaction-buffer.module';
import { RoleGuardModule } from './role_guard/role_guard.module';
import { FirebaseService } from './services/firebase.service';
import { PhoneIdentityService } from './services/phone-identity.service';
import { SchemaCompatibilityService } from './services/schema-compatibility.service';
import { SeaderModule } from './seeders/seader.module';

@Global()
@Module({
  imports: [
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
    FirebaseService,
  ],
  exports: [
    PhoneIdentityService,
    SchemaCompatibilityService,
    FirebaseService,
  ],
})
export class CommonModule {}
