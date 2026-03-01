import { INestApplication, Logger } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export class SwaggerRootConfig {
    private logger = new Logger('Swagger Root');
    private readonly app: INestApplication;

    constructor(app: INestApplication) {
        this.app = app;
    }

    public enable(enable: boolean) {
        if (!enable) return;

        const emptyDoc = {} as OpenAPIObject;

        SwaggerModule.setup('api/docs', this.app, emptyDoc, {
            explorer: true,
            swaggerOptions: {
                filter: true,
                persistAuthorization: true,
                urls: [
                    {
                        name: 'Prohome',
                        url: '/prohome/swagger-json',
                    },
                    {
                        name: 'CRM',
                        url: '/crm/swagger-json',
                    },
                ],
            },
        });

        this.logger.log('Swagger UI path: /swagger');
    }
}
