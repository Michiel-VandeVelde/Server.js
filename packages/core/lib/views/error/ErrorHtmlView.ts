/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in HTML. */

import HtmlView = require('../HtmlView');

// Creates a new ErrorHtmlView
class ErrorHtmlView extends HtmlView {
  constructor(settings?: any) {
    super('Error', settings);
  }

  // Renders the view with the given settings to the response
  override _render(settings: any, request: any, response: any, done: any) {
    this._renderTemplate('error/error', settings, request, response, done);
  }
}

export = ErrorHtmlView;
