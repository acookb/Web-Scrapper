import { Injectable } from '@nestjs/common';
import type { Link } from '../../domain/entities/link.entity';
import type { LinkRepository } from '../../domain/repositories/link.repository';
import { buildPaginatedResult } from '../../../../shared/pagination';
import type {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/pagination';
import { PrismaService } from './prisma.service';
import { toDomainLink } from './scraped-page.mapper';

@Injectable()
export class PrismaLinkRepository implements LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPageId(
    pageId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Link>> {
    const [records, total] = await this.prisma.$transaction([
      this.prisma.link.findMany({
        where: { pageId },
        orderBy: { position: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.link.count({ where: { pageId } }),
    ]);

    return buildPaginatedResult(
      records.map(toDomainLink),
      total,
      params.page,
      params.limit,
    );
  }
}
