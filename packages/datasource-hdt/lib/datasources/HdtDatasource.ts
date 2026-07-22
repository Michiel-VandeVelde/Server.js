/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

import LdfCore = require('@ldf/core');
import ExternalHdtDatasource = require('./ExternalHdtDatasource');
import type { Quad } from 'n3';
import type { BufferedIterator } from 'asynciterator';
import type { Query } from '@ldf/core/lib/types';
import type { HdtDatasourceOptions } from '../types';
import type { Document as HdtDocument } from 'hdt';

const Datasource = LdfCore.datasources.Datasource;
const { pushToDestination } = LdfCore.Util;

// Creates a new HdtDatasource
class HdtDatasource extends Datasource {
  protected _hdtFile!: string;
  protected _hdtDocument?: HdtDocument;

  constructor(options?: HdtDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    options = options || {};
    // Switch to external HDT datasource if the `external` flag is set.
    // This constructor intentionally returns a different object than `this`
    // (see LinkedDataFragmentsServer in @ldf/core for the same pattern) — not
    // expressible without a cast.
    if (options.external)
      return new ExternalHdtDatasource(options) as unknown as HdtDatasource;
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Loads the HDT datasource
  override async _initialize() {
    // Required lazily: `hdt` is an optionalDependency (native module), and this
    // path is only reached for in-process (non-`external`) HdtDatasource instances.
    const hdt: typeof import('hdt') = require('hdt');
    // Cast: `hdt`'s .d.ts and @types/n3 resolve to structurally-incompatible copies of
    // @rdfjs/types' DataFactory (a duplicate-version skew in the dependency tree, not a real
    // type mismatch — both describe the same n3 DataFactory instance at runtime).
    this._hdtDocument = await hdt.fromFile(this._hdtFile, { dataFactory: this.dataFactory as any });
  }

  // Writes the results of the query to the given quad stream
  override _executeQuery(query: Query, destination: BufferedIterator<Quad>) {
    // Only the default graph has results
    if (query.graph && query.graph.termType !== 'DefaultGraph') {
      destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
      destination.close();
      return;
    }
    this._hdtDocument!.searchTriples(query.subject, query.predicate, query.object,
      { limit: query.limit, offset: query.offset })
      .then((result) => {
        let triples = result.triples,
            estimatedTotalCount = result.totalCount,
            hasExactCount = result.hasExactCount;
        // Ensure the estimated total count is as least as large as the number of triples
        let tripleCount = triples.length, offset = query.offset || 0;
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < query.limit! ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        // Add the triples to the output
        for (let i = 0; i < tripleCount; i++)
          pushToDestination(destination, triples[i] as Quad);
        destination.close();
      },
      (error: Error) => { destination.emit('error', error); });
  }

  // Closes the data source
  override close(done?: () => void) {
    // Close the HDT document if it is open
    if (this._hdtDocument) {
      this._hdtDocument.close().then(done, done);
      delete this._hdtDocument;
    }
    // If initialization was still pending, close immediately after initializing
    else if (!this.initialized)
      this.on('initialized', this.close.bind(this, done));
  }
}


export = HdtDatasource;
