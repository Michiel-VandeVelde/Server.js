/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in RDF. */

import RdfView = require('../RdfView');
import type { Quad } from 'n3';
import type { RenderDone, ViewSettings } from '../../types';

// Creates a new NotFoundRdfView
class NotFoundRdfView extends RdfView {
  constructor(settings?: ViewSettings) {
    super('NotFound', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: Record<string, any>, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}

export = NotFoundRdfView;
