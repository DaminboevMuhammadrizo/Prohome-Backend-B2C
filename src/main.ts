import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const bigIntPrototype = BigInt.prototype as BigInt & {
    toJSON?: () => string;
  };
  bigIntPrototype.toJSON = function () {
    return this.toString();
  };

  app.enableCors({
    origin: '*',
  });
  const config = new DocumentBuilder()
    .setTitle('ProHome B2C API')
    .setDescription('ProHome B2C backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
