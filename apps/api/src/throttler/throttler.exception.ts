import { HttpException, HttpStatus } from '@nestjs/common';
import { THROTTLER_MESSAGE } from './throttler.constants.js';

export class ThrottlerException extends HttpException {
  constructor(message?: string) {
    super(message || THROTTLER_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
  }
}
