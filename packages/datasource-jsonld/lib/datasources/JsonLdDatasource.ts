/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An JsonLdDatasource fetches data from a JSON-LD document. */

import LdfCore = require('@ldf/core');
import { JsonLdParser } from 'jsonld-streaming-parser';
import type { Quad } from 'n3';
import type { MemoryDatasourceOptions } from '@ldf/core/lib/types';

const MemoryDatasource = LdfCore.datasources.MemoryDatasource;

let ACCEPT = 'application/ld+json;q=1.0,application/json;q=0.7';

// Creates a new JsonLdDatasource
class JsonLdDatasource extends MemoryDatasource {
  constructor(options?: MemoryDatasourceOptions) {
    super(options);
  }

  // Retrieves all quads from the document
  override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void) {
    let document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
    new JsonLdParser({ baseIRI: this._url, dataFactory: this.dataFactory })
      .import(document)
      .on('error', done)
      .on('data', addQuad)
      .on('end', done);
  }
}

export = JsonLdDatasource;
