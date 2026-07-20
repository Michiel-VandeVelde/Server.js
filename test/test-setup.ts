/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
/// <reference path="./global.d.ts" />

import * as URL from 'url';
import { Readable, Writable } from 'stream';

const g: any = global;

// Set up the sinon stubbing library
g.sinon = require('sinon');

// Set up the Chai assertion library
const chai = require('chai');
g.test = {};
g.expect = chai.expect;
g.should = chai.should();
chai.use(require('sinon-chai'));

// Test helper for the extractQueryParams function of routers
g.test.extractQueryParams = function (description: string, url: string, intent: string, query: any, expectedQuery: any) {
  const router = this;
  it(description + ' ' + intent, function () {
    const result = (router as any).extractQueryParams({ url: URL.parse(url, true) }, query);
    expect(result).to.equal(undefined, 'should not return anything');
    expect(query).to.deep.equal(expectedQuery, 'should match the expected query');
  });
};

// Creates a dummy HTTP response
g.test.createHttpResponse = function (contents: any, contentType: string) {
  const response: any = new Readable();
  response._read = function () {};
  response.statusCode = 200;
  response.headers = { 'content-type': contentType };
  response.abort = function () { response.aborted = true; };
  setImmediate(function () { response.push(contents); response.push(null); });
  return response;
};

// Creates an in-memory stream
g.test.createStreamCapture = function () {
  const stream: any = new Writable({ objectMode: true });
  stream.buffer = '';
  stream._write = function (chunk: any, encoding: any, callback: any) {
    this.buffer += chunk;
    callback && callback();
  };
  return stream;
};

chai.use(function (chai: any, utils: any) {
  // Checks whether the stream contains the given number of elements
  chai.Assertion.addMethod('streamWithLength', function (this: any, expectedLength: number, callback: any) {
    let stream = utils.flag(this, 'object'), length = 0, self = this;
    stream.on('data', function () { length++; });
    stream.on('end', function () {
      self.assert(length === expectedLength,
        'expected #{this} to be a stream of length ' + expectedLength + ', was ' + length,
        'expected #{this} not to be a stream of length ' + expectedLength);
      callback();
    });
  });
});
