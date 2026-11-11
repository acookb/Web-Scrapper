import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

/** HTTP setup shared by the real server and the integration tests. */
export function configureApp(app: INestApplication): void {
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}
