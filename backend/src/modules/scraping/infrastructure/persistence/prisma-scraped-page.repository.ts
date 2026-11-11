import { Injectable } from '@nestjs/common';
import { PageStatus as PrismaPageStatus } from '@prisma/client';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { PageStatus } from '../../domain/enums/page-status.enum';
import {
  CompleteScrapedPageInput,
  CreateScrapedPageInput,
  FailScrapedPageInput,
  PaginatedResult,
  PaginationParams,
  ScrapedPageRepository,
} from '../../domain/repositories/scraped-page.repository';
import { buildPaginatedResult } from '../../../../shared/pagination';
import { PrismaService } from './prisma.service';
import { toDomainPage, toPrismaStatus } from './scraped-page.mapper';

@Injectable()
export class PrismaScrapedPageRepository implements ScrapedPageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateScrapedPageInput): Promise<ScrapedPage> {
    const record = await this.prisma.scrapedPage.create({
      data: {
        id: input.id,
        url: input.url,
        status: PrismaPageStatus.IN_PROGRESS,
      },
    });
    return toDomainPage(record);
  }

  async findById(id: string): Promise<ScrapedPage | null> {
    const record = await this.prisma.scrapedPage.findUnique({ where: { id } });
    return record ? toDomainPage(record) : null;
  }

  async findPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<ScrapedPage>> {
    const skip = (params.page - 1) * params.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.scrapedPage.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.scrapedPage.count(),
    ]);

    return buildPaginatedResult(
      records.map(toDomainPage),
      total,
      params.page,
      params.limit,
    );
  }

  async markCompleted(input: CompleteScrapedPageInput): Promise<ScrapedPage> {
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.link.deleteMany({ where: { pageId: input.pageId } });

      if (input.links.length > 0) {
        await tx.link.createMany({
          data: input.links.map((link) => ({
            pageId: input.pageId,
            href: link.href,
            name: link.name,
          })),
        });
      }

      return tx.scrapedPage.update({
        where: { id: input.pageId },
        data: {
          title: input.title,
          status: PrismaPageStatus.COMPLETED,
          linkCount: input.links.length,
          errorMessage: null,
        },
      });
    });

    return toDomainPage(record);
  }

  async markFailed(input: FailScrapedPageInput): Promise<ScrapedPage> {
    const record = await this.prisma.scrapedPage.update({
      where: { id: input.pageId },
      data: {
        status: PrismaPageStatus.FAILED,
        errorMessage: input.errorMessage,
      },
    });
    return toDomainPage(record);
  }

  async updateStatus(id: string, status: PageStatus): Promise<void> {
    await this.prisma.scrapedPage.update({
      where: { id },
      data: { status: toPrismaStatus(status) },
    });
  }
}
