/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import * as http from 'http';
import { sinon } from './sinon';
import type { LdfRequest, LdfResponse } from '@ldf/core';

export interface DummyController {
  next?: (error?: Error) => void;
  error?: Error;
  result?: unknown;
  handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void;
}

/* Dummy server that emulates LinkedDataFragmentsServer */
export function DummyServer(controller: DummyController): http.Server {
  const server = http.createServer();
  server.on('request', (request: LdfRequest, response: LdfResponse) => {
    // End the response if the controller did not handle the request
    controller.next = sinon.spy((error?: Error) => {
      controller.error = error;
      if (!response.headersSent)
        response.writeHead(error ? 500 : 200);
      response.end((error && error.message) || '');
    });
    try { controller.result = controller.handleRequest(request, response, controller.next); }
    catch (error) { controller.next(error as Error); }
  });
  return server;
}
