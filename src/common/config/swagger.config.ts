import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BannerModule } from 'src/modules/banner/banner.module';
import { JobModule } from 'src/modules/job/job.module';
import { LocationModule } from 'src/modules/location/location.module';
import { MasterModule } from 'src/modules/user/master/master.module';
import { RatingModule } from 'src/modules/rating/rating.module';
import { RealEstateModule } from 'src/modules/real-estate/real-estate.module';
import { SkillTypeModule } from 'src/modules/skill-type/skill-type.module';
import { SkillsModule } from 'src/modules/skills/skills.module';
import { SocialModule } from 'src/modules/social/social.module';
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
            .setTitle('PRO HOME B2C API')
            .setDescription('PRO HOME B2C uchun API hujjatlari')
            .setVersion('1.0')
            .addBearerAuth()
            .setExternalDoc('OpenAPI JSON', '/prohome/swagger-json')
            .build();

        const document = SwaggerModule.createDocument(this.app, config, {
            include: [
                AuthModule, UserModule, MasterModule, LocationModule,
                SkillTypeModule, SkillsModule, RealEstateModule,
                JobModule, BannerModule, RatingModule, SocialModule,
            ],
        });

        this.app.use('/prohome/swagger-json', (req, res) => {
            res.json(document);
        });

        SwaggerModule.setup('docs', this.app, document);

        this.logger.log('Swagger docs: /docs');
        this.logger.log('Swagger JSON: /prohome/swagger-json');
    }
}
