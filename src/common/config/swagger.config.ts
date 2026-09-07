import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

        // `include` ataylab qo'llanilmaydi — shu tufayli avval Company/Blog(News,Reels)/
        // Notification/Analytics kabi modullar Swagger'da butunlay ko'rinmas edi. Endi
        // butun ilova hujjatlanadi, yangi modul qo'shilganda ham bu yerni eslab yurish shart emas.
        const document = SwaggerModule.createDocument(this.app, config);

        this.app.use('/prohome/swagger-json', (req, res) => {
            res.json(document);
        });

        SwaggerModule.setup('docs', this.app, document);

        this.logger.log('Swagger docs: /docs');
        this.logger.log('Swagger JSON: /prohome/swagger-json');
    }
}
