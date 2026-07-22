/*! @license ©2014–2017 Ruben Verborgh, Ghent University - imec */
/** An N3Datasource fetches data from Turtle/TriG/N-Triples/N-Quads/N3 documents. */

import LdfCore = require('@ldf/core');
import { Parser as N3Parser, Quad } from 'n3';
import type { MemoryDatasourceOptions } from '@ldf/core/lib/types';

const MemoryDatasource = LdfCore.datasources.MemoryDatasource;

let ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.9,text/turtle;q=0.8,application/n-triples;q=0.7,text/n3;q=0.4';

// Creates a new N3Datasource
class N3Datasource extends MemoryDatasource {
  constructor(options?: MemoryDatasourceOptions) {
    super(options);
    this._url = options && (options.url || options.file) || this._url;
  }

  // Retrieves all quads from the document
  override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void) {
    let document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
    // `_resetBlankNodePrefix` is a private static N3.Parser method, not exposed by @types/n3.
    (N3Parser as unknown as { _resetBlankNodePrefix(): void })._resetBlankNodePrefix();
    new N3Parser({ factory: this.dataFactory }).parse(document, (error: Error | null, quad?: Quad) => {
      quad ? addQuad(quad) : done(error ?? undefined);
    });
  }
}

export = N3Datasource;
