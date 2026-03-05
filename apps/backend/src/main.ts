import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ---- Keamanan ----
    app.use(helmet());

    // ---- CORS ----
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    });

    // ---- Global Prefix ----
    app.setGlobalPrefix('api');

    // ---- Validasi Global ----
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // ---- Swagger (Dokumentasi API) ----
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('ROCKET API')
            .setDescription('API Dokumentasi Aplikasi ROCKET — PT ASABRI (Persero)')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 ROCKET Backend berjalan di: http://localhost:${port}/api`);
    console.log(`📚 Dokumentasi API: http://localhost:${port}/api/docs`);
}

bootstrap();
