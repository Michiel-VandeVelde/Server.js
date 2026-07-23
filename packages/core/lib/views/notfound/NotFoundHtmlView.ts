/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in HTML. */

import HtmlView = require('../HtmlView');
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../../types';

// Creates a new NotFoundHtmlView
class NotFoundHtmlView extends HtmlView {
  constructor(settings?: ViewSettings) {
    super('NotFound', settings);
  }

  // Renders the view with the given settings to the response
  override _render(settings: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone) {
    this._renderTemplate('notfound/notfound', settings, request, response, done);
  }
}

export = NotFoundHtmlView;
