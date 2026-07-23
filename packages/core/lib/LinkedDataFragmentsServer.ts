/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

import _ = require('lodash');
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import type { Socket } from 'net';
import * as Util from './Util';
import ErrorController = require('./controllers/ErrorController');
import UrlData = require('./UrlData');
import type Controller = require('./controllers/Controller');
import type { LdfRequest, LdfResponse, LinkedDataFragmentsServerOptions } from './types';

// The object actually returned by the constructor below: a Node HTTP(S) server with
// LinkedDataFragmentsServer's own methods/fields copied onto it. See the constructor
// for why — instances of this class are never used directly; only `new`-ing it matters.
interface LinkedDataFragmentsServerInstance extends http.Server {
  _sockets: Record<number, Socket>;
  _log: (...args: unknown[]) => void;
  _accesslogger: (request: LdfRequest, response: LdfResponse) => void;
  _controllers: Controller[];
  _errorController: ErrorController;
  _defaultHeaders: Record<string, string>;
  _processRequest(request: LdfRequest, response: LdfResponse): void;
  _reportError(request: LdfRequest | Error | null, response?: LdfResponse, error?: Error): void;
  stop(): void;
}

// Creates a new LinkedDataFragmentsServer
class LinkedDataFragmentsServer {
  // Unlike the other core base classes, this class's own instance shape is never actually used:
  // the constructor always returns a different object (see below), and its prototype is patched
  // at runtime with methods copied from below — both need this index signature to type-check.
  [key: string]: any;

  constructor(options?: LinkedDataFragmentsServerOptions) {
    // Create the HTTP(S) server; `server` ends up holding either an http.Server or an
    // https.Server, plus the dynamically-assigned fields below, so it can't be precisely typed.
    let server: any, sockets = 0;
    let urlData = options && options.urlData ? options.urlData : new UrlData();
    switch (urlData.protocol) {
    case 'http':
      server = http.createServer();
      break;
    case 'https':
      const ssl = options!.ssl || {}, authentication = options!.authentication || {};
      // WebID authentication requires a client certificate
      if (authentication.webid)
        ssl.requestCert = ssl.rejectUnauthorized = true;
      server = https.createServer({ ...ssl, ..._.mapValues(ssl.keys, readHttpsOption) });
      break;
    default:
      throw new Error('The configured protocol ' + urlData.protocol + ' is invalid.');
    }

    // Copy over members
    for (let member in LinkedDataFragmentsServer.prototype)
      server[member] = LinkedDataFragmentsServer.prototype[member];

    // Assign settings
    server._sockets = {};
    server._log = options!.log || _.noop;
    server._accesslogger = options!.accesslogger || _.noop;
    server._controllers = options!.controllers || [];
    server._errorController = new ErrorController(options);
    server._defaultHeaders = options!.response && options!.response.headers || {};

    // Attach event listeners
    server.on('error', (error: Error) => { server._reportError(error); });
    server.on('request', (request: LdfRequest, response: LdfResponse) => {
      server._accesslogger(request, response);
      try { server._processRequest(request, response); }
      catch (error) { server._reportError(request, response, error); }
    });
    server.on('connection', (socket: Socket) => {
      let socketId = sockets++;
      server._sockets[socketId] = socket;
      socket.on('close', () => { delete server._sockets[socketId]; });
    });
    // The constructor intentionally returns a different object than `this`
    // (see LinkedDataFragmentsServerInstance above) — not expressible without a cast.
    return server as LinkedDataFragmentsServerInstance;
  }
}

// Handles an incoming HTTP request
LinkedDataFragmentsServer.prototype._processRequest = function (this: LinkedDataFragmentsServerInstance, request: LdfRequest, response: LdfResponse) {
  // Add default response headers
  for (let header in this._defaultHeaders)
    response.setHeader(header, this._defaultHeaders[header]);

  // Verify an allowed HTTP method was used
  switch (request.method) {
  // Allow GET requests
  case 'GET':
    break;
  // Don't write a body with HEAD and OPTIONS
  case 'HEAD':
  case 'OPTIONS':
    response.write = function () { return true; };
    response.end = response.end.bind(response, '', '' as BufferEncoding);
    break;
  // Reject all other methods
  default:
    response.writeHead(405, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
    return;
  }

  // Try each of the controllers in order
  let self = this, controllerId = 0;
  function nextController(error?: Error) {
    // Error if the previous controller failed
    if (error)
      response.emit('error', error);
    // Error if no controller left
    else if (controllerId >= self._controllers.length)
      response.emit('error', new Error('No controller for ' + request.url));
    // Otherwise, try the next controller
    else {
      let controller = self._controllers[controllerId++], next = _.once(nextController);
      try { controller.handleRequest(request, response, next); }
      catch (error) { next(error as Error); }
    }
  }
  response.on('error', (error: Error) => { self._reportError(request, response, error); });
  nextController();
};

// Serves an application error
LinkedDataFragmentsServer.prototype._reportError = function (this: LinkedDataFragmentsServerInstance, request: LdfRequest | Error | null, response?: LdfResponse, error?: Error) {
  // If no request or response is available, the server failed outside of a request; don't recover
  if (!response) {
    error = request as Error;
    request = null;
    response = undefined;
    this._log('Fatal error, exiting process\n', error.stack);
    return process.exit(-1);
  }

  // Log the error
  this._log(error!.stack);

  // Try to report the error in the response
  try {
    // Ensure errors are not handled recursively, and don't modify an already started response
    if (response.error || response.headersSent)
      return response.end();
    response.error = error;
    this._errorController.handleRequest(request as LdfRequest, response, _.noop);
  }
  catch (responseError) { this._log((responseError as Error).stack); }
};

// Stops the server
LinkedDataFragmentsServer.prototype.stop = function (this: LinkedDataFragmentsServerInstance) {
  // Don't accept new connections, and close existing ones
  this.close();
  for (let id in this._sockets)
    this._sockets[id].destroy();

  // Close all controllers
  this._controllers.forEach(function (this: LinkedDataFragmentsServerInstance, controller: Controller) {
    try { controller.close && controller.close(); }
    catch (error) { this._log(error); }
  }, this);
};

// Reads the value of an option for the https module
function readHttpsOption(value: string | string[]): string | Buffer | (string | Buffer)[] {
  // Read each value of an array
  if (Array.isArray(value))
    return value.map(readHttpsOption) as (string | Buffer)[];
  // Certificates and keys can be strings or files
  else if (typeof value === 'string' && fs.existsSync(value))
    return fs.readFileSync(value);
  // Other strings and regular objects are also allowed
  else
    return value;
}

export = LinkedDataFragmentsServer;
