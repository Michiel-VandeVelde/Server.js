/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A MemoryDatasource queries a set of in-memory quads. */

import Datasource = require('./Datasource');
import { Store as N3Store } from 'n3';

// Creates a new MemoryDatasource
class MemoryDatasource extends Datasource {
  constructor(options?: any) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);
    if (options.file) {
      if (!options.file.startsWith('file://') && !options.file.startsWith('http://') && !options.file.startsWith('https://'))
        options.file = `file://${options.file}`;
    }

    this._url = options && (options.url || options.file);
  }

  // Prepares the datasource for querying
  override _initialize(done?: any) {
    return new Promise<void>((resolve, reject) => {
      let quadStore = this._quadStore = new N3Store();
      this._getAllQuads((quad: any) => { quadStore.addQuad(quad); }, (error: any) => {
        if (error)
          return reject(error);
        return resolve();
      });
    });
  }

  // Retrieves all quads in the datasource
  _getAllQuads(addQuad: any, done: any) {
    throw new Error('_getAllQuads is not implemented');
  }

  // Writes the results of the query to the given quad stream
  override _executeQuery(query: any, destination: any) {
    let offset = query.offset || 0, limit = query.limit || Infinity,
        quads = this._quadStore.getQuads(query.subject, query.predicate, query.object, query.graph);
    // Send the metadata
    destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
    // Send the requested subset of quads
    for (let i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
      destination._push(quads[i]);
    destination.close();
  }
}

export = MemoryDatasource;
