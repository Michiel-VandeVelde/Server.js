/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
/// <reference path="./global.d.ts" />

import * as URL from 'url';
import { Readable, Writable } from 'stream';
import * as Chai from 'chai';

// Set up the sinon stubbing library
// Cast: `global.sinon` is declared in global.d.ts, but assigning to it via
// dot notation here still triggers a spurious "no index signature on
// typeof globalThis" error -- a @types/node ambient-global quirk unrelated
// to this file's own types. Narrow cast rather than widen the file's types.
(global as unknown as { sinon: typeof import('sinon') }).sinon = require('sinon');

// Set up the Chai assertion library
const chai: Chai.ChaiStatic = require('chai');
global.expect = chai.expect;
global.should = chai.should();
chai.use(require('sinon-chai'));

// Router shape this file relies on; a shared Router type isn't available yet
// at this layer of the migration (packages/core hasn't converted).
interface QueryParamsRouter {
  extractQueryParams(request: { url: URL.UrlWithParsedQuery }, query: Record<string, unknown>): void;
}

// Cast: `global.test` is this repo's own namespace of test helpers, but
// @types/mocha already declares an unrelated ambient `var test` (its TDD-
// interface alias for `it()`). The two names collide with incompatible
// types, so this assignment can't be typed against `typeof global.test`
// without fighting mocha's own declaration -- narrow the cast to just this
// one assignment rather than widening every helper's parameters below.
const testHelpers = global as unknown as {
  test: {
    extractQueryParams: (
      this: QueryParamsRouter, description: string, url: string, intent: string,
      query: Record<string, unknown>, expectedQuery: Record<string, unknown>,
    ) => void;
    createHttpResponse: (contents: any, contentType: string) => Readable & {
      statusCode: number; headers: Record<string, string>; abort(): void; aborted?: boolean;
    };
    createStreamCapture: () => Writable & { buffer: string };
  };
};
testHelpers.test = {} as typeof testHelpers.test;

// Test helper for the extractQueryParams function of routers
testHelpers.test.extractQueryParams = function (
  this: QueryParamsRouter, description: string, url: string, intent: string,
  query: Record<string, unknown>, expectedQuery: Record<string, unknown>,
) {
  const router = this;
  it(description + ' ' + intent, function () {
    const result = router.extractQueryParams({ url: URL.parse(url, true) }, query);
    expect(result).to.equal(undefined, 'should not return anything');
    expect(query).to.deep.equal(expectedQuery, 'should match the expected query');
  });
};

// Creates a dummy HTTP response
// `contents: any` matches Readable.push's own upstream signature (Node's
// @types/node also types `push(chunk: any)`), not a shortcut on our part.
testHelpers.test.createHttpResponse = function (contents: any, contentType: string) {
  const response = new Readable() as Readable & {
    statusCode: number; headers: Record<string, string>; abort(): void; aborted?: boolean;
  };
  response._read = function () {};
  response.statusCode = 200;
  response.headers = { 'content-type': contentType };
  response.abort = function () { response.aborted = true; };
  setImmediate(function () { response.push(contents); response.push(null); });
  return response;
};

// Creates an in-memory stream
testHelpers.test.createStreamCapture = function () {
  const stream = new Writable({ objectMode: true }) as Writable & { buffer: string };
  stream.buffer = '';
  stream._write = function (chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    this.buffer += chunk;
    callback && callback();
  };
  return stream;
};

chai.use(function (chai: Chai.ChaiStatic, utils: Chai.ChaiUtils) {
  // Checks whether the stream contains the given number of elements
  chai.Assertion.addMethod('streamWithLength', function (this: Chai.AssertionStatic, expectedLength: number, callback: () => void) {
    let stream = utils.flag(this, 'object') as NodeJS.ReadableStream, length = 0, self = this;
    stream.on('data', function () { length++; });
    stream.on('end', function () {
      self.assert(length === expectedLength,
        'expected #{this} to be a stream of length ' + expectedLength + ', was ' + length,
        'expected #{this} not to be a stream of length ' + expectedLength,
        expectedLength, length);
      callback();
    });
  });
});
