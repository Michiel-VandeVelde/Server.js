/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import QuadPatternFragmentsController = require('./lib/controllers/QuadPatternFragmentsController');
import QuadPatternRouter = require('./lib/routers/QuadPatternRouter');
import QuadPatternFragmentsHtmlView = require('./lib/views/quadpatternfragments/QuadPatternFragmentsHtmlView');
import QuadPatternFragmentsRdfView = require('./lib/views/quadpatternfragments/QuadPatternFragmentsRdfView');

export = {
  controllers: {
    QuadPatternFragmentsController,
  },
  routers: {
    QuadPatternRouter,
  },
  views: {
    quadpatternfragments: {
      QuadPatternFragmentsHtmlView,
      QuadPatternFragmentsRdfView,
    },
  },
};
