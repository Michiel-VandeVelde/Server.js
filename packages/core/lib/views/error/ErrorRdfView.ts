/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in RDF. */

import RdfView = require('../RdfView');

// Creates a new ErrorRdfView
class ErrorRdfView extends RdfView {
  constructor(settings?: any) {
    super('Error', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: any, data: any, metadata: any, done: any) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}

export = ErrorRdfView;
