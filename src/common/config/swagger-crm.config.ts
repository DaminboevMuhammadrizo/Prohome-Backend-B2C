// import { INestApplication, Logger } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { AuthModule } from 'src/modules/auth/auth.module';
// import { DashboardModule } from 'src/modules/dashboard/dashboard.module';
// import { DescriptionModule } from 'src/modules/description/description.module';
// import { LeadSourceModule } from 'src/modules/leeds/lead-source/lead-source.module';
// import { LeedsModule } from 'src/modules/leeds/leeds.module';
// import { StatusHistoryModule } from 'src/modules/status/status-history/status-history.module';
// import { StatusModule } from 'src/modules/status/status.module';
// import { TasksModule } from 'src/modules/tasks/tasks.module';

// export class SwaggerCrmConfig {
//     private logger = new Logger('Swagger CRM');
//     private readonly app: INestApplication;
//     constructor(app: INestApplication) {
//         this.app = app;
//     }

//     public enable(enable: boolean) {
//         if (!enable) return;

//         const config = new DocumentBuilder()
//             .setTitle('CRM API')
//             .setDescription('CRM (User) uchun API hujjatlari')
//             .setVersion('1.0')
//             .addBearerAuth()
//             .setExternalDoc('OpenAPI JSON', '/crm/swagger-json')
//             .build();

//         const document = SwaggerModule.createDocument(this.app, config, {
//             include: [AuthModule, LeedsModule, LeadSourceModule, StatusModule, StatusHistoryModule, DescriptionModule, TasksModule, DashboardModule],
//         });

//         this.app.use('/crm/swagger-json', (req, res) => {
//             res.json(document);
//         });

//         this.logger.log('CRM swagger json: /crm/swagger-json');
//     }
// }
