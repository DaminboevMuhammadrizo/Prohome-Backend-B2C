import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // JSON javoblarni gzip qiladi — katta ro'yxat javoblari ~70% kichrayadi
    app.use(compression());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    const bigIntPrototype = BigInt.prototype as BigInt & { toJSON?: () => string };
    bigIntPrototype.toJSON = function () { return this.toString() };

    app.enableCors({ origin: '*' });

    const config = new DocumentBuilder()
        .setTitle('ProHome B2C API')
        .setDescription('ProHome B2C backend API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            filter: true,
            showRequestDuration: true,
        },
    });
    await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
