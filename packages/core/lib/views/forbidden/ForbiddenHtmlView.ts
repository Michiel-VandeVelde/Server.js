/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A ForbiddenHtmlView represents a 401 response in HTML. */

import HtmlView = require('../HtmlView');

// Creates a new ForbiddenHtmlView
class ForbiddenHtmlView extends HtmlView {
  constructor(settings?: any) {
    super('Forbidden', settings);
  }

  // Renders the view with the given settings to the response
  override _render(settings: any, request: any, response: any, done: any) {
    this._renderTemplate('forbidden/forbidden', settings, request, response, done);
  }
}

export = ForbiddenHtmlView;
