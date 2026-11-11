import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapingModule } from './modules/scraping/scraping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScrapingModule,
  ],
})
export class AppModule {}
