/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An RdfaDatasource fetches data from a JSON-LD document. */

import LdfCore = require('@ldf/core');
import { RdfaParser } from 'rdfa-streaming-parser';
import type { Quad } from 'n3';
import type { MemoryDatasourceOptions } from '@ldf/core/lib/types';

const MemoryDatasource = LdfCore.datasources.MemoryDatasource;

let ACCEPT = 'text/html;q=1.0,application/xhtml+xml;q=0.7';

// Creates a new RdfaDatasource
class RdfaDatasource extends MemoryDatasource {
  constructor(options?: MemoryDatasourceOptions) {
    super(options);
    this._url = options && (options.url || options.file) || this._url;
  }

  // Retrieves all quads from the document
  override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void) {
    let document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
    new RdfaParser({ baseIRI: this._url, dataFactory: this.dataFactory })
      .import(document)
      .on('error', done)
      .on('data', addQuad)
      .on('end', done);
  }
}

export = RdfaDatasource;
