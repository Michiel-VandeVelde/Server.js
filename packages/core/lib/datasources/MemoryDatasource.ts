/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A MemoryDatasource queries a set of in-memory quads. */

import Datasource = require('./Datasource');
import { Store as N3Store, Quad } from 'n3';
import { BufferedIterator } from 'asynciterator';
import type { MemoryDatasourceOptions, Query } from '../types';

// Creates a new MemoryDatasource
class MemoryDatasource extends Datasource {
  // Always set in practice: a MemoryDatasource is only usable once configured with a `url`
  // or `file` (see the datasource-jsonld/n3/rdfa packages, all of which require one).
  protected _url!: string;
  protected _quadStore!: N3Store;

  constructor(options?: MemoryDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);
    options = options || {};
    if (options.file) {
      if (!options.file.startsWith('file://') && !options.file.startsWith('http://') && !options.file.startsWith('https://'))
        options.file = `file://${options.file}`;
    }

    this._url = (options.url || options.file)!;
  }

  // Prepares the datasource for querying
  override _initialize(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let quadStore = this._quadStore = new N3Store();
      this._getAllQuads((quad: Quad) => { quadStore.addQuad(quad); }, (error?: Error) => {
        if (error)
          return reject(error);
        return resolve();
      });
    });
  }

  // Retrieves all quads in the datasource
  _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
    throw new Error('_getAllQuads is not implemented');
  }

  // Writes the results of the query to the given quad stream
  override _executeQuery(query: Query, destination: BufferedIterator<Quad>) {
    let offset = query.offset || 0, limit = query.limit || Infinity,
        quads = this._quadStore.getQuads(query.subject ?? null, query.predicate ?? null, query.object ?? null, query.graph ?? null);
    // Send the metadata
    destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
    // Send the requested subset of quads.
    // `_push` is protected on BufferedIterator (meant for use by its own subclasses), but this
    // codebase's `_executeQuery` pattern predates that guarantee and pushes into it externally.
    const pushableDestination = destination as unknown as { _push(quad: Quad): void };
    for (let i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
      pushableDestination._push(quads[i]);
    destination.close();
  }
}

export = MemoryDatasource;
