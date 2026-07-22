/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import type { BufferedIterator } from 'asynciterator';

// Escapes a string for use in a regular expression
export function toRegExp(string: string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

// Pushes an item into a BufferedIterator from outside the class.
// `_push` is protected on asynciterator's BufferedIterator (meant for its own subclasses),
// but this codebase's `_executeQuery` implementations push into it externally, predating
// that guarantee — centralized here rather than repeating the cast in every datasource.
export function pushToDestination<T>(destination: BufferedIterator<T>, item: T): void {
  (destination as unknown as { _push(item: T): void })._push(item);
}

// The MIME type for plaintext
export const MIME_PLAINTEXT = 'text/plain;charset=utf-8';

type ErrorBaseConstructor = new (message?: string) => Error;
type ErrorInit = (this: Error, ...args: any[]) => void;

// Creates a specific type of error, optionally deriving from a given base error type.
// Can be called as `createErrorType(name, init?)` or `createErrorType(BaseError, name, init?)`.
// NOTE: `ErrorType` below is an ES5-style pseudo-class whose constructor returns a value
// that isn't `this` (a pattern that predates real JS classes) — TypeScript has no way to
// express that natively, so the return value is deliberately cast to the shape callers
// actually rely on: a `new`-able constructor producing an `Error`.
export function createErrorType(BaseError?: ErrorBaseConstructor | string, nameOrInit?: string | ErrorInit, initArg?: ErrorInit): ErrorBaseConstructor {
  let Base: ErrorBaseConstructor, name: string, init: ErrorInit | undefined;
  if (typeof BaseError !== 'function') {
    Base = Error;
    name = BaseError as string;
    init = nameOrInit as ErrorInit | undefined;
  }
  else {
    Base = BaseError;
    name = nameOrInit as string;
    init = initArg;
  }
  function ErrorType(this: any, message?: string): any {
    let error: any = this instanceof (ErrorType as any) ? this : new (ErrorType as any)(message);
    error.name = name;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, arguments as unknown as any[]);
    return error;
  }
  ErrorType.prototype = new Base();
  ErrorType.prototype.name = name;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType as unknown as ErrorBaseConstructor;
}
