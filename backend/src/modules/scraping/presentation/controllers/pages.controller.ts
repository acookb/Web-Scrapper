import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateScrapeJobUseCase } from '../../application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from '../../application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from '../../application/use-cases/list-pages.use-case';
import { PageStatus } from '../../domain/enums/page-status.enum';
import { CreatePageDto } from '../dto/create-page.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@Controller('pages')
export class PagesController {
  constructor(
    private readonly createScrapeJobUseCase: CreateScrapeJobUseCase,
    private readonly listPagesUseCase: ListPagesUseCase,
    private readonly listPageLinksUseCase: ListPageLinksUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePageDto) {
    try {
      const page = await this.createScrapeJobUseCase.execute({ url: body.url });
      return {
        id: page.id,
        url: page.url,
        title: page.title,
        status: page.status,
        linkCount: page.linkCount,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid URL';
      throw new BadRequestException(message);
    }
  }

  @Get()
  async list(@Query() query: PaginationQueryDto) {
    const result = await this.listPagesUseCase.execute({
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.items.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        status: page.status,
        linkCount: page.linkCount,
        errorMessage: page.errorMessage,
        displayValue:
          page.status === PageStatus.IN_PROGRESS
            ? 'in progress'
            : page.status === PageStatus.FAILED
              ? 'failed'
              : String(page.linkCount),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id/links')
  async listLinks(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.listPageLinksUseCase.execute(id, {
      page: query.page,
      limit: query.limit,
    });

    return {
      page: {
        id: result.page.id,
        url: result.page.url,
        title: result.page.title,
        status: result.page.status,
        linkCount: result.page.linkCount,
        errorMessage: result.page.errorMessage,
      },
      data: result.links.items.map((link) => ({
        id: link.id,
        name: link.name,
        href: link.href,
      })),
      meta: {
        total: result.links.total,
        page: result.links.page,
        limit: result.links.limit,
        totalPages: result.links.totalPages,
      },
    };
  }
}
