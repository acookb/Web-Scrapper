import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentVariables, validateEnvironment } from './environment';

/**
 * Loads `.env`, fails start-up on invalid settings and exposes them as the
 * typed `EnvironmentVariables` provider.
 */
@Global()
@Module({
  imports: [ConfigModule.forRoot({ validate: validateEnvironment })],
  providers: [
    {
      provide: EnvironmentVariables,
      useFactory: () => validateEnvironment(process.env),
    },
  ],
  exports: [EnvironmentVariables],
})
export class EnvironmentModule {}
