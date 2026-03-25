import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApartmentModule } from 'src/modules/apartment/apartment.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BannerModule } from 'src/modules/banner/banner.module';
import { JobModule } from 'src/modules/job/job.module';
import { RegionModule } from 'src/modules/region/region.module';
import { UserModule } from 'src/modules/user/user.module';
export class SwaggerProhomeConfig {
    private logger = new Logger('Swagger Prohome');
    private readonly app: INestApplication;

    constructor(app: INestApplication) {
        this.app = app;
    }

    public enable(enable: boolean) {
        if (!enable) return;

        const config = new DocumentBuilder()
            .setTitle('PRO HOME API')
            .setDescription('PRO HOME (Auth) uchun API hujjatlari')
            .setVersion('1.0')
            .addBearerAuth()
            .setExternalDoc('OpenAPI JSON', '/prohome/swagger-json')
            .build();

        const document = SwaggerModule.createDocument(this.app, config, {
            include: [AuthModule, RegionModule, UserModule, JobModule, BannerModule, ApartmentModule]
        });

        this.app.use('/prohome/swagger-json', (req, res) => {
            res.json(document);
        });

        this.logger.log('Prohome swagger json: /prohome/swagger-json');
    }
}
