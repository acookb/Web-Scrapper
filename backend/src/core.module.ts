import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EnvironmentVariables } from './config/environment';
import { EnvironmentModule } from './config/environment.module';

/** Validated configuration and the Redis connection shared by the API and the worker. */
@Module({
  imports: [
    EnvironmentModule,
    BullModule.forRootAsync({
      imports: [EnvironmentModule],
      inject: [EnvironmentVariables],
      useFactory: (env: EnvironmentVariables) => ({
        prefix: env.QUEUE_PREFIX,
        connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
      }),
    }),
  ],
})
export class CoreModule {}
