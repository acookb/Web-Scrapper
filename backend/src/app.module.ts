import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { EnvironmentVariables } from './config/environment';
import { CoreModule } from './core.module';
import { HealthModule } from './modules/health/health.module';
import { ScrapingModule } from './modules/scraping/scraping.module';

@Module({
  imports: [
    CoreModule,
    ThrottlerModule.forRootAsync({
      inject: [EnvironmentVariables],
      useFactory: (env: EnvironmentVariables) => [
        { ttl: 60_000, limit: env.THROTTLE_LIMIT },
      ],
    }),
    ScrapingModule,
    HealthModule,
  ],
})
export class AppModule {}
