/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/// <reference path="./global.d.ts" />

import * as http from 'http';

type Next = (error?: Error) => void;

// Minimal shape this file relies on; a real Controller/LdfRequest/LdfResponse
// type isn't available yet at this layer of the migration (packages/core
// hasn't converted). Narrower than `any`, but still permissive since test
// files construct controller/request/response mocks of varying shapes.
interface DummyController {
  handleRequest(request: http.IncomingMessage, response: http.ServerResponse, next: Next): unknown;
  next?: Next;
  error?: Error;
  result?: unknown;
}

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(controller: DummyController): http.Server {
  const server = http.createServer();
  server.on('request', function (request: http.IncomingMessage, response: http.ServerResponse) {
    // End the response if the controller did not handle the request
    controller.next = sinon.spy(function (error?: Error) {
      controller.error = error;
      if (!response.headersSent)
        response.writeHead(error ? 500 : 200);
      response.end(error && error.message || '');
    });
    try { controller.result = controller.handleRequest(request, response, controller.next); }
    catch (error) { controller.next(error as Error); }
  });
  return server;
}

// Cast: this is a plain function (not a class) that is conventionally invoked
// as `new DummyServer(...)` across the test suite, relying on the JS rule
// that `new` on a function returning an object uses that returned object. TS
// has no construct signature for plain functions, so widen via `unknown`
// rather than `any` -- callers still get a real, checked constructor shape.
export = DummyServer as unknown as new (controller: DummyController) => http.Server;
