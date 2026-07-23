/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An empty data source doesn't contain any quads. */

import MemoryDatasource = require('./MemoryDatasource');
import type { Quad } from 'n3';
import type { MemoryDatasourceOptions } from '../types';

// Creates a new EmptyDatasource
class EmptyDatasource extends MemoryDatasource {
  constructor(options?: MemoryDatasourceOptions) {
    super(options);
  }

  // Retrieves all quads in the datasource
  override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void) { done(); }
}

export = EmptyDatasource;
