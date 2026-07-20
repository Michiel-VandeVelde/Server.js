/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate HTML responses. */

import View = require('./View');
import qejs = require('qejs');
import q = require('q');
import * as path from 'path';
import _ = require('lodash');
import * as RdfString from 'rdf-string';
import UrlData = require('../UrlData');

// Creates a new HTML view with the given name and settings
class HtmlView extends View {
  constructor(viewName?: any, settings?: any) {
    settings = settings || {};
    settings.urlData = settings.urlData || new UrlData();
    let defaults = {
      cache: true, RdfString: RdfString,
      assetsPath: settings.urlData.assetsPath || '/', baseURL: settings.urlData.baseURL || '/',
      title: '', header: settings && settings.title,
    };
    super(viewName, 'text/html', { ...settings, ...defaults });
  }

  // Renders the template with the given name to the response
  _renderTemplate(templateName: any, options: any, request: any, response: any, done: any) {
    // Initialize all view extensions
    let extensions = options.extensions || (options.extensions = {}), self = this;
    for (let extension in extensions) {
      if (!extensions[extension])
        extensions[extension] = this._renderViewExtensionContents(extension, options, request, response);
      else if (extensions[extension] === 'function')
        extensions[extension] = newExtensionViewConstructor(extension, options, request, response);
    }

    // Render the template with its options
    let fileName = (templateName[0] === '/' ? templateName : path.join(__dirname, templateName)) + '.html';
    qejs.renderFile(fileName, options)
      .then((html: any) => { response.write(html); done(); })
      .fail((error: any) => { done(error); });

    function newExtensionViewConstructor(extension: any, options: any, request: any, response: any) {
      return function (data: any) {
        let subOptions = { ...options };
        for (let key in data)
          subOptions[key] = data[key];
        return self._renderViewExtensionContents(extension, subOptions, request, response);
      };
    }
  }

  // Renders the view extensions to a string, returned through a promise
  _renderViewExtensionContents(name: any, options: any, request: any, response: any) {
    let buffer = '', writer = { write: function (data: any) { buffer += data; }, end: _.noop };
    return q.ninvoke(this, '_renderViewExtensions', name, options, request, writer)
      .then(() => { return buffer; });
  }
}

export = HtmlView;
