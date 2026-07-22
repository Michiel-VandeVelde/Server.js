/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An ExternalHdtDatasource uses an external process to query an HDT document. */

import LdfCore = require('@ldf/core');
import * as fs from 'fs';
import * as path from 'path';
import { Parser as N3Parser, Quad } from 'n3';
import { spawn } from 'child_process';
import type { BufferedIterator } from 'asynciterator';
import type { Query } from '@ldf/core/lib/types';
import type { ExternalHdtDatasourceOptions } from '../types';

const Datasource = LdfCore.datasources.Datasource;
const { pushToDestination } = LdfCore.Util;

let hdtUtility = path.join(__dirname, '../../node_modules/.bin/hdt');

// Creates a new ExternalHdtDatasource
class ExternalHdtDatasource extends Datasource {
  protected _options: ExternalHdtDatasourceOptions;
  protected _hdtFile: string;

  constructor(options?: ExternalHdtDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);


    // Test whether the HDT file exists
    this._options = options = options || {};
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Prepares the datasource for querying
  override async _initialize() {
    if (this._options.checkFile !== false) {
      if (!fs.existsSync(this._hdtFile))
        throw new Error('Not an HDT file: ' + this._hdtFile);
      if (!fs.existsSync(hdtUtility))
        throw new Error('hdt not found: ' + hdtUtility);
    }
  }

  // Writes the results of the query to the given quad stream
  override _executeQuery(query: Query, destination: BufferedIterator<Quad>) {
    // Only the default graph has results
    if (query.graph && query.graph.termType !== 'DefaultGraph') {
      destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
      destination.close();
      return;
    }

    // Execute the external HDT utility
    let hdtFile = this._hdtFile, offset = query.offset || 0, limit = query.limit || Infinity,
        hdt = spawn(hdtUtility, [
          '--query', (query.subject   || '?s') + ' ' +
          (query.predicate || '?p') + ' ' + (query.object || '?o'),
          '--offset', String(offset), '--limit', String(limit), '--format', 'turtle',
          '--', hdtFile,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
    // Parse the result triples
    hdt.stdout!.setEncoding('utf8');
    let parser = new N3Parser(), tripleCount = 0, estimatedTotalCount = 0, hasExactCount = true;
    parser.parse(hdt.stdout!, (error, triple) => {
      if (error)
        destination.emit('error', new Error('Invalid query result: ' + error.message));
      else if (triple)
        tripleCount++, pushToDestination(destination, triple);
      else {
        // Ensure the estimated total count is as least as large as the number of triples
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < query.limit! ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        destination.close();
      }
    });
    // `_prefixes` is a private N3.Parser field, not exposed by @types/n3.
    (parser as unknown as { _prefixes: Record<string, string> })._prefixes._ = '_:'; // Ensure blank nodes are named consistently

    // Extract the estimated number of total matches from the first (comment) line
    hdt.stdout!.once('data', (header: Buffer | string) => {
      estimatedTotalCount = parseInt(header.toString().match(/\d+/)?.[0] ?? '0', 10) || 0;
      hasExactCount = header.toString().indexOf('estimated') < 0;
    });

    // Report query errors
    hdt.on('exit', (exitCode) => {
      exitCode && destination.emit('error', new Error('Could not query ' + hdtFile));
    });
  }
}

export = ExternalHdtDatasource;
