import * as SinonStatic from 'sinon';
import * as Chai from 'chai';

declare global {
  // eslint-disable-next-line no-var
  var sinon: typeof SinonStatic;
  // eslint-disable-next-line no-var
  var expect: Chai.ExpectStatic;
  // eslint-disable-next-line no-var
  var should: Chai.Should;
  // eslint-disable-next-line no-var
  var test: {
    extractQueryParams(description: string, url: string, intent: string, query: any, expectedQuery: any): void;
    createHttpResponse(contents: any, contentType: string): NodeJS.ReadableStream & {
      statusCode: number;
      headers: any;
      abort(): void;
    };
    createStreamCapture(): NodeJS.WritableStream & { buffer: string };
  };
}

export {};
