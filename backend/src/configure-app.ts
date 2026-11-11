import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export const OPENAPI_PATH = 'docs';

/** HTTP setup shared by the real server and the integration tests. */
export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Web Scraper API')
      .setDescription(
        'Submit a URL to scrape it asynchronously, then browse the scraped pages and their links.',
      )
      .setVersion('1.0.0')
      .build(),
  );
  SwaggerModule.setup(OPENAPI_PATH, app, document);
}
