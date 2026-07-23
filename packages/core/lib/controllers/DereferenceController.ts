/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A DeferenceController responds to dereferencing requests */

import Controller = require('./Controller');
import url = require('url');
import _ = require('lodash');
import * as Util from '../Util';
import type { DereferenceControllerOptions, LdfRequest, LdfResponse } from '../types';

// Creates a new DeferenceController
class DeferenceController extends Controller {
  protected _paths: Record<string, { path: string }>;
  protected _matcher: RegExp;

  constructor(options?: DereferenceControllerOptions) {
    options = options || {};
    super(options);
    let paths = this._paths = options.dereference || {};
    this._matcher = /$0^/;
    if (!_.isEmpty(paths))
      this._matcher = new RegExp('^(' + Object.keys(paths).map(Util.toRegExp).join('|') + ')');
  }

  // Dereferences a URL by redirecting to its subject fragment of a certain data source
  override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void) {
    let match = this._matcher.exec(request.url!), datasource;
    if (datasource = match && this._paths[match[1]]) {
      let entity = url.format(_.defaults({
        pathname: datasource.path,
        query: { subject: url.format(request.parsedUrl!) },
      }, request.parsedUrl!));
      response.writeHead(303, { 'Location': entity, 'Content-Type': Util.MIME_PLAINTEXT });
      response.end(entity);
    }
    else
      next();
  }
}

export = DeferenceController;
