/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a TPF or QPF in HTML. */

import LdfCore = require('@ldf/core');
import { join } from 'path';

const HtmlView = LdfCore.views.HtmlView;

// Creates a new QuadPatternFragmentsHtmlView
class QuadPatternFragmentsHtmlView extends HtmlView {
  constructor(settings?: any) {
    super('QuadPatternFragments', settings);

    this.viewDirectory = __dirname;
  }

  // Renders the view with the given settings to the response
  override _render(settings: any, request: any, response: any, done: any) {
    // Read the data and metadata
    let self = this, quads: any[] = settings.quads = [], results = settings.results;
    results.on('data', (triple: any) => { quads.push(triple); });
    results.on('end',  () => { settings.metadata && renderHtml(); });
    results.getProperty('metadata', (metadata: any) => {
      settings.metadata = metadata;
      results.ended && renderHtml();
    });

    // Generates the HTML after the data and metadata have been retrieved
    function renderHtml() {
      let template = settings.datasource.role === 'index' ? 'index' : 'datasource';
      settings.extensions = { Before: null, FormBefore: null, FormAfter: null, QuadBefore: 'function', QuadAfter: 'function', After: null };
      self._renderTemplate(join(self.viewDirectory, template), settings, request, response, done);
    }
  }
}

export = QuadPatternFragmentsHtmlView;
