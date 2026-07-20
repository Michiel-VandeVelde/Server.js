/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An empty data source doesn't contain any quads. */

import MemoryDatasource = require('./MemoryDatasource');

// Creates a new EmptyDatasource
class EmptyDatasource extends MemoryDatasource {
  constructor(options?: any) {
    super(options);
  }

  // Retrieves all quads in the datasource
  override _getAllQuads(addQuad: any, done: any) { done(); }
}

export = EmptyDatasource;
