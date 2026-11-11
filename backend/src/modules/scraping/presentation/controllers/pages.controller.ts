import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateScrapeJobUseCase } from '../../application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from '../../application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from '../../application/use-cases/list-pages.use-case';
import { CreatePageDto } from '../dto/create-page.dto';
import {
  ErrorResponse,
  PageLinksResponse,
  PageResponse,
  PaginatedPagesResponse,
  toLinkResponse,
  toPageResponse,
  toPaginatedResponse,
} from '../dto/page.response';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

@ApiTags('pages')
@Controller('pages')
@UseFilters(DomainExceptionFilter)
export class PagesController {
  constructor(
    private readonly createScrapeJobUseCase: CreateScrapeJobUseCase,
    private readonly listPagesUseCase: ListPagesUseCase,
    private readonly listPageLinksUseCase: ListPageLinksUseCase,
  ) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Queue a page for scraping',
    description:
      'Responds immediately with the page IN_PROGRESS; a background worker scrapes it.',
  })
  @ApiCreatedResponse({ type: PageResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiServiceUnavailableResponse({ type: ErrorResponse })
  async create(@Body() body: CreatePageDto): Promise<PageResponse> {
    const page = await this.createScrapeJobUseCase.execute({ url: body.url });
    return toPageResponse(page);
  }

  @Get()
  @ApiOperation({ summary: 'List scraped pages, newest first' })
  @ApiOkResponse({ type: PaginatedPagesResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedPagesResponse> {
    const result = await this.listPagesUseCase.execute(query);
    return toPaginatedResponse(result, toPageResponse);
  }

  @Get(':id/links')
  @ApiOperation({ summary: 'List the links of a page in document order' })
  @ApiOkResponse({ type: PageLinksResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
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
