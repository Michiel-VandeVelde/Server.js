/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import SummaryController = require('./lib/controllers/SummaryController');
import QuadPatternFragmentsHtmlViewSummary = require('./lib/views/summary/QuadPatternFragmentsHtmlView-Summary');
import QuadPatternFragmentsRdfViewSummary = require('./lib/views/summary/QuadPatternFragmentsRdfView-Summary');
import SummaryRdfView = require('./lib/views/summary/SummaryRdfView');

export = {
  controllers: {
    SummaryController,
  },
  views: {
    summary: {
      'QuadPatternFragmentsHtmlView-Summary': QuadPatternFragmentsHtmlViewSummary,
      'QuadPatternFragmentsRdfView-Summary': QuadPatternFragmentsRdfViewSummary,
      SummaryRdfView,
    },
  },
};
