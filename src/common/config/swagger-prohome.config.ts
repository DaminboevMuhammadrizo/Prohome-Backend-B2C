// import { INestApplication, Logger } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { AuthModule } from 'src/modules/auth/auth.module';
// import { CampanyModule } from 'src/modules/campany/campany.module';
// import { ChatModule } from 'src/modules/chat/chat.module';
// import { CompanySubscriptionModule } from 'src/modules/company-subscription/company-subscription.module';
// import { DiscountRoomModule } from 'src/modules/discount-room/discount-room.module';
// import { GoogleSheetsModule } from 'src/modules/google-sheets/google-sheets.module';
// import { OtherModule } from 'src/modules/other/other.module';
// import { PriceModule } from 'src/modules/price/price.module';
// import { ProjectsModule } from 'src/modules/projects/projects.module';
// import { LogsModule } from 'src/modules/requests/logs.module';
// import { RoomModule } from 'src/modules/room/room.module';
// import { SubscriptionPlanModule } from 'src/modules/subscription-plan/subscription-plan.module';
// import { UserModule } from 'src/modules/user/user.module';
// import { CommonModule } from '../common.module';
// import { CoreModule } from '../core/core.module';
// import { DashboardModule } from 'src/modules/dashboard/dashboard.module';

// export class SwaggerProhomeConfig {
//   private logger = new Logger('Swagger Prohome');
//   private readonly app: INestApplication;

//   constructor(app: INestApplication) {
//     this.app = app;
//   }

//   public enable(enable: boolean) {
//     if (!enable) return;

//     const config = new DocumentBuilder()
//       .setTitle('PRO HOME API')
//       .setDescription('PRO HOME (Auth) uchun API hujjatlari')
//       .setVersion('1.0')
//       .addBearerAuth()
//       .setExternalDoc('OpenAPI JSON', '/prohome/swagger-json')
//       .build();

//     const document = SwaggerModule.createDocument(this.app, config, {
//       include: [
//         CoreModule,
//         CommonModule,
//         AuthModule,
//         DashboardModule,
//         UserModule,
//         CampanyModule,
//         ProjectsModule,
//         RoomModule,
//         OtherModule,
//         ChatModule,
//         SubscriptionPlanModule,
//         CompanySubscriptionModule,
//         DiscountRoomModule,
//         PriceModule,
//         LogsModule,
//         GoogleSheetsModule,
//       ],
//     });

//     this.app.use('/prohome/swagger-json', (req, res) => {
//       res.json(document);
//     });

//     this.logger.log('Prohome swagger json: /prohome/swagger-json');
//   }
// }
