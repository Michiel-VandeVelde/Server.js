/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import AssetsController = require('./lib/controllers/AssetsController');
import Controller = require('./lib/controllers/Controller');
import DereferenceController = require('./lib/controllers/DereferenceController');
import ErrorController = require('./lib/controllers/ErrorController');
import NotFoundController = require('./lib/controllers/NotFoundController');
import Datasource = require('./lib/datasources/Datasource');
import EmptyDatasource = require('./lib/datasources/EmptyDatasource');
import IndexDatasource = require('./lib/datasources/IndexDatasource');
import MemoryDatasource = require('./lib/datasources/MemoryDatasource');
import DatasourceRouter = require('./lib/routers/DatasourceRouter');
import PageRouter = require('./lib/routers/PageRouter');
import ErrorHtmlView = require('./lib/views/error/ErrorHtmlView');
import ErrorRdfView = require('./lib/views/error/ErrorRdfView');
import ForbiddenHtmlView = require('./lib/views/forbidden/ForbiddenHtmlView');
import NotFoundHtmlView = require('./lib/views/notfound/NotFoundHtmlView');
import NotFoundRdfView = require('./lib/views/notfound/NotFoundRdfView');
import HtmlView = require('./lib/views/HtmlView');
import RdfView = require('./lib/views/RdfView');
import View = require('./lib/views/View');
import ViewCollection = require('./lib/views/ViewCollection');
import CliRunner = require('./lib/CliRunner');
import LinkedDataFragmentsServer = require('./lib/LinkedDataFragmentsServer');
import LinkedDataFragmentsServerWorker = require('./lib/LinkedDataFragmentsServerWorker');
import UrlData = require('./lib/UrlData');
import * as Util from './lib/Util';

export = {
  controllers: {
    AssetsController,
    Controller,
    DereferenceController,
    ErrorController,
    NotFoundController,
  },
  datasources: {
    Datasource,
    EmptyDatasource,
    IndexDatasource,
    MemoryDatasource,
  },
  routers: {
    DatasourceRouter,
    PageRouter,
  },
  views: {
    error: {
      ErrorHtmlView,
      ErrorRdfView,
    },
    forbidden: {
      ForbiddenHtmlView,
    },
    notfound: {
      NotFoundHtmlView,
      NotFoundRdfView,
    },
    HtmlView,
    RdfView,
    View,
    ViewCollection,
  },
  runCli: CliRunner.runCli,
  runCustom: CliRunner.runCustom,
  LinkedDataFragmentsServer,
  LinkedDataFragmentsServerWorker,
  UrlData,
  Util,
};
