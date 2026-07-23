import * as SinonStatic from 'sinon';
import * as Chai from 'chai';

declare module 'chai' {
  interface Assertion {
    // Custom assertion registered in test-setup.ts via chai.Assertion.addMethod;
    // real chai has no built-in typing for it.
    streamWithLength(expectedLength: number, callback: (err?: any) => void): void;
  }
}

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
