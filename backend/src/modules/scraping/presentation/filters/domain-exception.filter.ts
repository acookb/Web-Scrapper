import { Catch, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { InvalidUrlError } from '../../domain/errors/invalid-url.error';
import { PageNotFoundError } from '../../domain/errors/page-not-found.error';

type DomainError = InvalidUrlError | PageNotFoundError;

@Catch(InvalidUrlError, PageNotFoundError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const status =
      error instanceof PageNotFoundError
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message: error.message, error: error.name });
  }
}
