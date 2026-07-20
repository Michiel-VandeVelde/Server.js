/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in RDF. */

import RdfView = require('../RdfView');

// Creates a new NotFoundRdfView
class NotFoundRdfView extends RdfView {
  constructor(settings?: any) {
    super('NotFound', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: any, data: any, metadata: any, done: any) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}

export = NotFoundRdfView;
