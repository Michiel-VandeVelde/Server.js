/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in HTML. */

import HtmlView = require('../HtmlView');

// Creates a new NotFoundHtmlView
class NotFoundHtmlView extends HtmlView {
  constructor(settings?: any) {
    super('NotFound', settings);
  }

  // Renders the view with the given settings to the response
  override _render(settings: any, request: any, response: any, done: any) {
    this._renderTemplate('notfound/notfound', settings, request, response, done);
  }
}

export = NotFoundHtmlView;
