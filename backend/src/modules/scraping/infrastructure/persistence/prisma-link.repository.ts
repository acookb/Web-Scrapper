import { Injectable } from '@nestjs/common';
import { Link } from '../../domain/entities/link.entity';
import {
  LinkRepository,
} from '../../domain/repositories/link.repository';
import {
  PaginatedResult,
  PaginationParams,
} from '../../domain/repositories/scraped-page.repository';
import { buildPaginatedResult } from '../../../../shared/pagination';
import { PrismaService } from './prisma.service';
import { toDomainLink } from './scraped-page.mapper';

@Injectable()
export class PrismaLinkRepository implements LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPageId(
    pageId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Link>> {
    const skip = (params.page - 1) * params.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.link.findMany({
        where: { pageId },
        orderBy: { createdAt: 'asc' },
        skip,
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
