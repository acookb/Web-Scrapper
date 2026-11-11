import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { CreateScrapeJobUseCase } from '../../application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from '../../application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from '../../application/use-cases/list-pages.use-case';
import { CreatePageDto } from '../dto/create-page.dto';
import {
  toLinkResponse,
  toPageResponse,
  toPaginatedResponse,
} from '../dto/page.response';
import type {
  PageLinksResponse,
  PageResponse,
  PaginatedResponse,
} from '../dto/page.response';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

@Controller('pages')
@UseFilters(DomainExceptionFilter)
export class PagesController {
  constructor(
    private readonly createScrapeJobUseCase: CreateScrapeJobUseCase,
    private readonly listPagesUseCase: ListPagesUseCase,
    private readonly listPageLinksUseCase: ListPageLinksUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreatePageDto): Promise<PageResponse> {
    const page = await this.createScrapeJobUseCase.execute({ url: body.url });
    return toPageResponse(page);
  }

  @Get()
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<PageResponse>> {
    const result = await this.listPagesUseCase.execute(query);
    return toPaginatedResponse(result, toPageResponse);
  }

  @Get(':id/links')
  async listLinks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PageLinksResponse> {
    const result = await this.listPageLinksUseCase.execute(id, query);
    return {
      page: toPageResponse(result.page),
      ...toPaginatedResponse(result.links, toLinkResponse),
    };
  }
}
