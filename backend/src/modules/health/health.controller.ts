import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import type {
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Queue } from 'bullmq';
import { PrismaService } from '../scraping/infrastructure/persistence/prisma.service';
import { SCRAPE_QUEUE_NAME } from '../scraping/infrastructure/queue/scrape.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @InjectQueue(SCRAPE_QUEUE_NAME) private readonly scrapeQueue: Queue,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: PostgreSQL and Redis are reachable' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.checkRedis(),
    ]);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check('redis');
    try {
      // Any command that needs a round trip to Redis proves it is reachable.
      await this.scrapeQueue.getVersion();
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: String(error) });
    }
  }
}
