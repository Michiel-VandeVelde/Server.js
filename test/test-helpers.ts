/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
import { it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { Readable, Writable } from 'stream';
import type { RouterRequest } from '@ldf/core';

interface QueryParamsRouter {
  // Router tests pass plain test-double query objects, not full Query
  // instances, since extractQueryParams only ever merges object properties.
  extractQueryParams(request: RouterRequest, query: Record<string, unknown>): void;
}

// Generates an `it` block that verifies a router's extractQueryParams behavior
export function extractQueryParams(
  router: QueryParamsRouter,
  description: string,
  url: string,
  intent: string,
  query: Record<string, unknown>,
  expectedQuery: Record<string, unknown>,
): void {
  it(description + ' ' + intent, () => {
    const result = router.extractQueryParams({ url: parseUrl(url, true) } as RouterRequest, query);
    expect(result).toBeUndefined();
    expect(query).toEqual(expectedQuery);
  });
}

// Creates a dummy HTTP response
export function createHttpResponse(contents: string, contentType: string): Readable & { statusCode: number; headers: Record<string, string>; aborted?: boolean; abort(): void } {
  const response = new Readable() as Readable & { statusCode: number; headers: Record<string, string>; aborted?: boolean; abort(): void };
  response._read = () => {};
  response.statusCode = 200;
  response.headers = { 'content-type': contentType };
  response.abort = () => { response.aborted = true; };
  setImmediate(() => { response.push(contents); response.push(null); });
  return response;
}

// Creates an in-memory stream
export function createStreamCapture(): Writable & { buffer: string } {
  const stream = new Writable({ objectMode: true }) as Writable & { buffer: string };
  stream.buffer = '';
  stream._write = (chunk, encoding, callback) => {
    stream.buffer += chunk;
    callback();
  };
  return stream;
}

// Counts the elements in a stream and resolves once it ends
export function streamLength(stream: NodeJS.EventEmitter): Promise<number> {
  return new Promise((resolve) => {
    let length = 0;
    stream.on('data', () => { length++; });
    stream.on('end', () => resolve(length));
  });
}
