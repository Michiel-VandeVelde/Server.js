/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* View is a base class for objects that generate server responses. */

import { join } from 'path';
import ViewCollection = require('./ViewCollection');
import type { ContentTypeMatch, LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../types';

// Creates a view with the given name
class View {
  public name: string;
  // Assigned via `_parseContentTypes`, always called from the constructor.
  public supportedContentTypes!: ContentTypeMatch[];
  // Always set in practice: every real view is constructed with settings carrying a dataFactory,
  // propagated from the server config (see e.g. RdfView's writer methods, which use it unconditionally).
  public dataFactory!: NonNullable<ViewSettings['dataFactory']>;
  protected _defaults: ViewSettings;
  protected _supportedContentTypeMatcher!: Record<string, boolean>;

  constructor(viewName?: string | null, contentTypes?: string | null, defaults?: ViewSettings) {
    this.name = viewName || '';
    this._parseContentTypes(contentTypes);
    this._defaults = defaults || {};
    this.dataFactory = this._defaults.dataFactory!;
    if (this._defaults.views)
      this._defaults.views = new ViewCollection(defaults!.views as View[]);
  }

  // Parses a string of content types into an array of objects
  // i.e., 'a/b,q=0.7' => [{ type: 'a/b', responseType: 'a/b;charset=utf-8', quality: 0.7 }]
  // The "type" represents the MIME type,
  // whereas "responseType" contains the value of the Content-Type header with encoding.
  _parseContentTypes(contentTypes?: string | null) {
    let matcher = this._supportedContentTypeMatcher = Object.create(null);
    let parsedContentTypes: ContentTypeMatch[] = [];
    if (typeof contentTypes === 'string') {
      parsedContentTypes = contentTypes.split(',').map((typeString) => {
        let contentType = typeString.match(/[^;,]*/)![0],
            responseType = contentType + ';charset=utf-8',
            quality = typeString.match(/;q=([0-9.]+)/);
        matcher[contentType] = matcher[responseType] = true;
        return {
          type: contentType,
          responseType: responseType,
          quality: quality ? Math.min(Math.max(parseFloat(quality[1]), 0.0), 1.0) : 1.0,
        };
      });
    }
    this.supportedContentTypes = parsedContentTypes;
  }

  // Indicates whether the view supports the given content type
  supportsContentType(contentType: string) {
    return this._supportedContentTypeMatcher[contentType];
  }

  // Renders the view with the given options to the response
  render(options: Record<string, unknown>, request: LdfRequest, response: LdfResponse, done?: RenderDone) {
    // Initialize view-specific settings
    let settings: Record<string, any> = { ...options, ...this._defaults };
    if (!settings.contentType)
      settings.contentType = response.getHeader('Content-Type');

    // Export our base view, so it can be reused by other modules
    settings.viewPathBase = join(__dirname, 'base.html');

    // Render the view and end the response when done
    this._render(settings, request, response, (error?: Error | null) => {
      if (error)
        response.emit('error', error);
      response.end();
      done && done();
    });
  }

  // Gets extensions with the given name for this view
  _getViewExtensions(name: string, contentType: string): View[] {
    let extensions: View[] = this._defaults.views ? (this._defaults.views as ViewCollection).getViews(this.name + ':' + name) : [];
    if (extensions.length) {
      extensions = extensions.filter((extension) => {
        return extension.supportsContentType(contentType);
      });
    }
    return extensions;
  }

  // Renders the extensions with the given name for this view
  _renderViewExtensions(name: string, options: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone) {
    let self = this, extensions = this._getViewExtensions(name, options.contentType), i = 0;
    (function next() {
      if (i < extensions.length)
        self._renderViewExtension(extensions[i++], options, request, response, next);
      else
        done();
    })();
  }

  // Renders the specified view extension
  _renderViewExtension(extension: View, options: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone) {
    extension.render(options, request, response, done);
  }

  // Renders the view with the given settings to the response
  // (settings combines the view defaults with instance-specific options)
  _render(settings: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    throw new Error('The _render method is not yet implemented.');
  }
}



export = View;
