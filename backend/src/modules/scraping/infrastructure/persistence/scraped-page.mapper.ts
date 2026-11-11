import {
  Link as PrismaLink,
  PageStatus as PrismaPageStatus,
  ScrapedPage as PrismaScrapedPage,
} from '@prisma/client';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { Link } from '../../domain/entities/link.entity';
import { PageStatus } from '../../domain/enums/page-status.enum';

export function toDomainPage(record: PrismaScrapedPage): ScrapedPage {
  return new ScrapedPage(
    record.id,
    record.url,
    record.title,
    record.status as PageStatus,
    record.linkCount,
    record.errorMessage,
    record.createdAt,
    record.updatedAt,
  );
}

export function toDomainLink(record: PrismaLink): Link {
  return new Link(
    record.id,
    record.pageId,
    record.href,
    record.name,
    record.createdAt,
  );
}

export function toPrismaStatus(status: PageStatus): PrismaPageStatus {
  return status as PrismaPageStatus;
}
