/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import TimegateController = require('./lib/controllers/TimegateController');
import MementoControllerExtension = require('./lib/controllers/MementoControllerExtension');
import QuadPatternFragmentsHtmlViewMemento = require('./lib/views/memento/QuadPatternFragmentsHtmlView-Memento');

export = {
  controllers: {
    TimegateController,
    MementoControllerExtension,
  },
  views: {
    memento: {
      'QuadPatternFragmentsHtmlView-Memento': QuadPatternFragmentsHtmlViewMemento,
    },
  },
};
