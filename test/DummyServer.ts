/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/// <reference path="./global.d.ts" />

import * as http from 'http';

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(controller: any): http.Server {
  const server = http.createServer();
  server.on('request', function (request: any, response: any) {
    // End the response if the controller did not handle the request
    controller.next = sinon.spy(function (error: any) {
      controller.error = error;
      if (!response.headersSent)
        response.writeHead(error ? 500 : 200);
      response.end(error && error.message || '');
    });
    try { controller.result = controller.handleRequest(request, response, controller.next); }
    catch (error) { controller.next(error); }
  });
  return server;
}

// Cast to `any`: this is a plain function (not a class) that is conventionally
// invoked as `new DummyServer(...)` across the test suite, relying on the JS
// rule that `new` on a function returning an object uses that returned object.
// TS has no construct signature for plain functions, so widen the export type.
export = DummyServer as any;
