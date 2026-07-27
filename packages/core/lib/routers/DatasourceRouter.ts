/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A DatasourceRouter routes URLs to data sources. */

import UrlData = require('../UrlData');
import type { Query, RouterRequest } from '../types';

// Creates a new DatasourceRouter
class DatasourceRouter {
  private _baseLength: number;

  constructor(options?: { urlData?: Pick<UrlData, 'baseURLPath'> }) {
    let urlData = options && options.urlData || new UrlData();
    this._baseLength = urlData.baseURLPath.length - 1;
  }

  // Extracts the data source parameter from the request and adds it to the query
  extractQueryParams(request: RouterRequest, query: Query) {
    (query.features || (query.features = {})).datasource = true;
    let path = request.url && request.url.pathname || '/';
    query.datasource = path.substr(this._baseLength);
  }
}

export = DatasourceRouter;
