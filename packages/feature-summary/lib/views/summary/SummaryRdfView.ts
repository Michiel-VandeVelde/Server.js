/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

import LdfCore = require('@ldf/core');
import type { Quad } from 'n3';
import type { RenderDone, ViewSettings } from '@ldf/core/lib/types';

const RdfView = LdfCore.views.RdfView;

interface SummaryResultsSettings {
  results: { on(event: string, listener: (...args: any[]) => void): unknown };
}

// Creates a new SummaryRdfView
class SummaryRdfView extends RdfView {
  constructor(settings?: ViewSettings) {
    super('Summary', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: SummaryResultsSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone) {
    // Add summary triples
    settings.results.on('data', data);
    settings.results.on('end',  done);
  }
}

export = SummaryRdfView;
