/*! @license ©2014–2017 Ruben Verborgh, Ghent University - imec */
/** An N3Datasource fetches data from Turtle/TriG/N-Triples/N-Quads/N3 documents. */

import LdfCore = require('@ldf/core');
import { Parser as N3Parser } from 'n3';

const MemoryDatasource = LdfCore.datasources.MemoryDatasource;

let ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.9,text/turtle;q=0.8,application/n-triples;q=0.7,text/n3;q=0.4';

// Creates a new N3Datasource
class N3Datasource extends MemoryDatasource {
  constructor(options?: any) {
    super(options);
    this._url = options && (options.url || options.file);
  }

  // Retrieves all quads from the document
  override _getAllQuads(addQuad: any, done: any) {
    let document = (this._fetch as any)({ url: this._url, headers: { accept: ACCEPT } }, done);
    (N3Parser as any)._resetBlankNodePrefix();
    (new N3Parser({ factory: this.dataFactory } as any) as any).parse(document, (error: any, quad: any) => {
      quad ? addQuad(quad) : done(error);
    });
  }
}

export = N3Datasource;
