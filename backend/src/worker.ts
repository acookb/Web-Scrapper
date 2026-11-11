import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  logger.log('Scrape worker started and listening for BullMQ jobs');
}

void bootstrap();
