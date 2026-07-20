/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

// Escapes a string for use in a regular expression
export function toRegExp(string: string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

// The MIME type for plaintext
export const MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// Creates a specific type of error
export function createErrorType(BaseError?: any, name?: any, init?: any): any {
  if (typeof BaseError !== 'function')
    init = name, name = BaseError, BaseError = Error;
  function ErrorType(this: any, message?: string): any {
    let error: any = this instanceof (ErrorType as any) ? this : new (ErrorType as any)(message);
    error.name = name;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, arguments);
    return error;
  }
  ErrorType.prototype = new BaseError();
  ErrorType.prototype.name = name;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType;
}
