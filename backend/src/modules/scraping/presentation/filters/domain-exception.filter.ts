import { Catch, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ScrapeQueueUnavailableError } from '../../application/errors/scrape-queue-unavailable.error';
import { InvalidUrlError } from '../../domain/errors/invalid-url.error';
import { PageNotFoundError } from '../../domain/errors/page-not-found.error';

type MappedError =
  InvalidUrlError | PageNotFoundError | ScrapeQueueUnavailableError;

function statusFor(error: MappedError): HttpStatus {
  if (error instanceof PageNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }
  if (error instanceof ScrapeQueueUnavailableError) {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
  return HttpStatus.BAD_REQUEST;
}

/** Translates domain and application errors into HTTP responses. */
@Catch(InvalidUrlError, PageNotFoundError, ScrapeQueueUnavailableError)
export class DomainExceptionFilter implements ExceptionFilter<MappedError> {
  catch(error: MappedError, host: ArgumentsHost): void {
    const status = statusFor(error);

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message, error: error.name });
  }
}
