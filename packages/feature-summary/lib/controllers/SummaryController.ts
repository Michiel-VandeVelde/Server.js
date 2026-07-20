/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* An SummaryController responds to requests for summaries */

import LdfCore = require('@ldf/core');
import * as fs from 'fs';
import * as path from 'path';
import { StreamParser } from 'n3';

const Controller = LdfCore.controllers.Controller;
const Util = LdfCore.Util;

// Creates a new SummaryController
class SummaryController extends Controller {
  [key: string]: any;

  constructor(options?: any) {
    options = options || {};
    super(options);
    // Settings for data summaries
    let summaries = options.summaries || {};
    this._enabled = summaries.dir || summaries.path;
    this._summariesFolder = summaries.dir || path.join(__dirname, '../../summaries');
    // Set up path matching
    this._summariesPath = summaries.path  || '/summaries/',
    this._matcher = new RegExp('^' + Util.toRegExp(this._summariesPath) + '(.+)$');
  }

  override _handleRequest(request: any, response: any, next: any) {
    if (!this._enabled)
      return next();

    let summaryMatch = this._matcher && this._matcher.exec(request.url), datasource;
    if (datasource = summaryMatch && summaryMatch[1]) {
      let summaryFile = path.join(this._summariesFolder, datasource + '.ttl');

      // Read summary triples from file
      let streamParser = new StreamParser({ blankNodePrefix: '', baseIRI: this._baseUrl.pathname } as any),
          inputStream = fs.createReadStream(summaryFile);

      // If the summary cannot be read, invoke the next controller without error
      inputStream.on('error', (error: any) => { next(); });
      inputStream.pipe(streamParser as any);

      // Set caching
      response.setHeader('Cache-Control', 'public,max-age=604800'); // 14 days

      // Render the summary
      let view = this._negotiateView('Summary', request, response);
      view.render({ prefixes: this._prefixes, results: streamParser }, request, response);
    }
    else
      next();
  }
}

export = SummaryController;
