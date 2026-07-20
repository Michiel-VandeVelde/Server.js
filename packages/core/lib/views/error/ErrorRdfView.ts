/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in RDF. */

import RdfView = require('../RdfView');
import type { Quad } from 'n3';
import type { RenderDone, ViewSettings } from '../../types';

// Creates a new ErrorRdfView
class ErrorRdfView extends RdfView {
  constructor(settings?: ViewSettings) {
    super('Error', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  override _generateRdf(settings: Record<string, any>, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}

export = ErrorRdfView;
