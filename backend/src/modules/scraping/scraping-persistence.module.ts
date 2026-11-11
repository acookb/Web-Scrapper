import { Module } from '@nestjs/common';
import { LINK_REPOSITORY } from './domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from './domain/repositories/scraped-page.repository';
import { PrismaLinkRepository } from './infrastructure/persistence/prisma-link.repository';
import { PrismaScrapedPageRepository } from './infrastructure/persistence/prisma-scraped-page.repository';
import { PrismaService } from './infrastructure/persistence/prisma.service';

@Module({
  providers: [
    PrismaService,
    { provide: SCRAPED_PAGE_REPOSITORY, useClass: PrismaScrapedPageRepository },
    { provide: LINK_REPOSITORY, useClass: PrismaLinkRepository },
  ],
  exports: [PrismaService, SCRAPED_PAGE_REPOSITORY, LINK_REPOSITORY],
})
export class ScrapingPersistenceModule {}
