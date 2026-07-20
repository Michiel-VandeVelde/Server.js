/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* A MementoHtmlViewExtension extends the Quad Pattern Fragments HTML view with Memento details. */

import LdfCore = require('@ldf/core');
import TimegateController = require('../../controllers/TimegateController');
import * as path from 'path';

const HtmlView = LdfCore.views.HtmlView;

// Creates a new MementoHtmlViewExtension
class MementoHtmlViewExtension extends HtmlView {
  constructor(settings: any) {
    super('QuadPatternFragments:Before', settings);
    let timegates = settings.timegates || {};
    this._invertedTimegateMap = (TimegateController as any).parseInvertedTimegateMap(timegates.mementos, settings.urlData);
  }

  // Renders the view with the given settings to the response
  override _render(settings: any, request: any, response: any, done: any) {
    let memento = this._invertedTimegateMap[settings.datasource.id];
    if (!memento)
      return done();
    this._renderTemplate(path.join(__dirname, 'memento-details'), {
      start: memento.interval[0],
      end:   memento.interval[1],
    }, request, response, done);
  }
}

export = MementoHtmlViewExtension;
