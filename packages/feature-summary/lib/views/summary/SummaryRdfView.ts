/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

import LdfCore = require('@ldf/core');

const RdfView = LdfCore.views.RdfView;

// Creates a new SummaryRdfView
class SummaryRdfView extends RdfView {
  constructor(settings?: any) {
    super('Summary', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: any, data: any, metadata: any, done: any) {
    // Add summary triples
    settings.results.on('data', data);
    settings.results.on('end',  done);
  }
}

export = SummaryRdfView;
