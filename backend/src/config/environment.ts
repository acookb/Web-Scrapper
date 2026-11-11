import 'reflect-metadata';
import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/** Every setting read by the API and the worker, validated at start-up. */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  QUEUE_PREFIX: string = 'bull';

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  SCRAPE_CONCURRENCY: number = 5;

  @IsInt()
  @Min(1)
  @Max(10)
  SCRAPE_ATTEMPTS: number = 3;

  @IsInt()
  @Min(100)
  SCRAPE_BACKOFF_MS: number = 2000;

  @IsInt()
  @Min(1000)
  SCRAPER_TIMEOUT_MS: number = 30_000;

  @IsInt()
  @Min(1024)
  SCRAPER_MAX_BYTES: number = 10 * 1024 * 1024;

  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    ['true', '1', true].includes(obj[key] as string | boolean),
  )
  @IsBoolean()
  SCRAPER_ALLOW_PRIVATE_HOSTS: boolean = false;

  @IsInt()
  @Min(1)
  STALE_PAGE_TIMEOUT_MINUTES: number = 15;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 20;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(environment);

  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return environment;
}
