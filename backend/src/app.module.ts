import { Module } from '@nestjs/common';
import { CoreModule } from './core.module';
import { ScrapingModule } from './modules/scraping/scraping.module';

@Module({
  imports: [CoreModule, ScrapingModule],
})
export class AppModule {}
