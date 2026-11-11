import { PageStatus as PrismaPageStatus } from '@prisma/client';
import type {
  Link as PrismaLink,
  ScrapedPage as PrismaScrapedPage,
} from '@prisma/client';
import { Link } from '../../domain/entities/link.entity';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { PageStatus } from '../../domain/enums/page-status.enum';

/** Exhaustive: adding a database status without mapping it fails to compile. */
const STATUS_FROM_DATABASE: Record<PrismaPageStatus, PageStatus> = {
  [PrismaPageStatus.IN_PROGRESS]: PageStatus.IN_PROGRESS,
  [PrismaPageStatus.COMPLETED]: PageStatus.COMPLETED,
  [PrismaPageStatus.FAILED]: PageStatus.FAILED,
};

export function toDomainPage(record: PrismaScrapedPage): ScrapedPage {
  return new ScrapedPage(
    record.id,
    record.url,
    record.title,
    STATUS_FROM_DATABASE[record.status],
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
