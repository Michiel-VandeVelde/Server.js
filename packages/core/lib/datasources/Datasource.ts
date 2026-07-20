/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A Datasource provides base functionality for queryable access to a source of quads. */

import * as fs from 'fs';
import UrlData = require('../UrlData');
import { BufferedIterator } from 'asynciterator';
import { EventEmitter } from 'events';
import { stringToTerm } from 'rdf-string';
import type { NamedNode, Quad } from 'n3';
import type { DatasourceOptions, Query } from '../types';

// Creates a new Datasource
class Datasource extends EventEmitter {
  [key: string]: any;

  public urlData: UrlData;
  public title?: string;
  public id?: string;
  public hide?: boolean;
  public enabled: boolean;
  public description?: string;
  public path: string;
  public url: string;
  public license?: string;
  public licenseUrl?: string;
  public copyright?: string;
  public homepage?: string;
  // Always set in practice: every real datasource config supplies a dataFactory (see the
  // `components/*.jsonld` of each datasource-* package); `_request` always falls back to the
  // `request` package below, so it's never actually undefined either.
  public dataFactory!: NonNullable<DatasourceOptions['dataFactory']>;
  public initialized: boolean;
  public supportedFeatures: Readonly<Record<string, boolean>>;
  protected _datasourcePath: string;
  protected _skolemizeBlacklist: Record<string, boolean>;
  protected _request!: NonNullable<DatasourceOptions['request']>;
  protected _graph?: NamedNode;
  protected _queryGraphReplacements?: Record<string, string>;
  protected _supportsQuads: boolean;

  constructor(options?: DatasourceOptions, supportedFeatureList?: string[]) {
    super();

    // Set the options
    options = options || {};
    this.urlData = options.urlData || new UrlData();
    let path = (options.path || '').replace(/^\//, '');
    this._datasourcePath = this.urlData.baseURLPath + encodeURI(path);
    this._skolemizeBlacklist = options.skolemizeBlacklist || {};
    this.title = options.title;
    this.id = options.id;
    this.hide = options.hide;
    this.enabled = options.enabled !== false;
    if (this.enabled === false)
      this.hide = true;
    this.description = options.description;
    this.path = this._datasourcePath;
    this.url = this.urlData.baseURLRoot + this._datasourcePath + '#dataset';
    this.license = options.license;
    this.licenseUrl = options.licenseUrl;
    this.copyright = options.copyright;
    this.homepage = options.homepage;
    this._request = options.request || require('request');
    this.dataFactory = options.dataFactory!;
    if (options.graph) {
      this._graph = this.dataFactory!.namedNode(options.graph);
      this._queryGraphReplacements = Object.create(null);
      this._queryGraphReplacements![''] = 'urn:ldf:emptyGraph';
      this._queryGraphReplacements![options.graph] = '';
    }
    this._supportsQuads = 'quads' in options ? options.quads! : true;

    // Whether the datasource can be queried
    this.initialized = false;

    // Expose the supported query features
    if (supportedFeatureList && supportedFeatureList.length) {
      let objectSupportedFeatures: Record<string, boolean> = {};
      for (let i = 0; i < supportedFeatureList.length; i++)
        objectSupportedFeatures[supportedFeatureList[i]] = true;
      this.supportedFeatures =  objectSupportedFeatures;
    }
    else
      this.supportedFeatures = {};
    if (!this._supportsQuads)
      delete (this.supportedFeatures as Record<string, boolean>).quadPattern;
    Object.freeze(this.supportedFeatures);
  }


  // Initialize the datasource asynchronously
  initialize() {
    if (!this.enabled) {
      this.initialized = true;
      return this.emit('initialized');
    }

    try {
      this._initialize()
        .then(() => {
          this.initialized = true;
          this.emit('initialized');
        })
        .catch((error) => this.emit('error', error));
    }
    catch (error) {
      this.emit('error', error);
    }
  }

  // Prepares the datasource for querying
  async _initialize() {

  }

  // Checks whether the data source can evaluate the given query
  supportsQuery(query: Query) {
    // An uninitialized datasource does not support any query
    if (!this.initialized)
      return false;

    // A query is supported if the data source supports all of its features
    let features = query.features, supportedFeatures = this.supportedFeatures, feature;
    if (features) {
      for (feature in features) {
        if (features[feature] && !supportedFeatures[feature])
          return false;
      }
      return true;
    }
    // A query without features is supported if this data source has at least one feature
    else {
      for (feature in supportedFeatures) {
        if (supportedFeatures[feature])
          return true;
      }
      return false;
    }
  }

  // Selects the quads that match the given query, returning a quad stream
  select(query: Query, onError?: (error: Error) => void) {
    if (!this.initialized)
      return onError && onError(new Error('The datasource is not initialized yet'));
    if (!this.supportsQuery(query))
      return onError && onError(new Error('The datasource does not support the given query'));
    query = { ...query };
    const dataFactory = this.dataFactory!;

    // Translate blank nodes IRIs in the query to blank nodes
    let blankNodePrefix = this.urlData.blankNodePrefix, blankNodePrefixLength = this.urlData.blankNodePrefixLength;
    if (query.subject && query.subject.termType === 'NamedNode' && query.subject.value.indexOf(blankNodePrefix) === 0)
      query.subject = dataFactory.blankNode(query.subject.value.substr(blankNodePrefixLength));
    if (query.object && query.object.termType === 'NamedNode'  && query.object.value.indexOf(blankNodePrefix) === 0)
      query.object  = dataFactory.blankNode(query.object.value.substr(blankNodePrefixLength));
    if (query.graph && query.graph.termType === 'NamedNode'   && query.graph.value.indexOf(blankNodePrefix) === 0)
      query.graph   = dataFactory.blankNode(query.graph.value.substr(blankNodePrefixLength));

    // Force the default graph if QPF support is disable
    if (!this._supportsQuads)
      query.graph = dataFactory.defaultGraph();

    // If a custom default graph was set, query it as the default graph
    if (this._graph && query.graph && this._queryGraphReplacements && query.graph.value in this._queryGraphReplacements)
      query.graph = stringToTerm(this._queryGraphReplacements[query.graph.value], dataFactory) as Query['graph'];

    // Transform the received quads
    let destination = new BufferedIterator<Quad>(), outputQuads, defaultGraph = this._graph;
    outputQuads = destination.map((quad: Quad) => {
      let { subject, predicate, object, graph } = quad;
      // Translate blank nodes in the result to blank node IRIs.
      if (quad.subject && quad.subject.termType === 'BlankNode' && !this._skolemizeBlacklist[quad.subject.value])
        subject = dataFactory.namedNode(blankNodePrefix + quad.subject.value);
      if (quad.object  && quad.object.termType  === 'BlankNode' && !this._skolemizeBlacklist[quad.object.value])
        object = dataFactory.namedNode(blankNodePrefix + quad.object.value);
      if (quad.graph && quad.graph.termType === 'BlankNode' && !this._skolemizeBlacklist[quad.graph.value])
        graph = dataFactory.namedNode(blankNodePrefix + quad.graph.value);
      // If a custom default graph was set, move default graph triples there.
      else if (defaultGraph && (!quad.graph || quad.graph.termType === 'DefaultGraph'))
        graph = defaultGraph;
      return dataFactory.quad(subject, predicate, object, graph);
    });
    outputQuads.copyProperties(destination, ['metadata']);
    onError && outputQuads.on('error', onError);

    // Execute the query
    try { this._executeQuery(query, destination); }
    catch (error) { outputQuads.emit('error', error); }
    return outputQuads;
  }

  // Writes the results of the query to the given destination
  _executeQuery(query: Query, destination: BufferedIterator<Quad>) {
    throw new Error('_executeQuery has not been implemented');
  }

  // Retrieves a stream through HTTP or the local file system
  // Return type is EventEmitter (rather than the more specific stream types each branch actually
  // produces — a request.Request, fs.ReadStream, or a bare EventEmitter): callers only ever use
  // the event-emitter surface (see e.g. JsonLdParser#import, which accepts a plain EventEmitter).
  _fetch(options: { url: string; headers?: Record<string, string> }): EventEmitter {
    let stream: EventEmitter,
        url = options.url, protocolMatch = /^(?:([a-z]+):)?/.exec(url)!;
    switch (protocolMatch[1] || 'file') {
    // Fetch a representation through HTTP(S)
    case 'http':
    case 'https':
      stream = this._request!(options);
      stream.on('response', (response: any) => {
        if (response.statusCode >= 300) {
          setImmediate(() => {
            stream.emit('error', new Error(url + ' returned ' + response.statusCode));
          });
        }
      });
      break;
    // Read a file from the local filesystem
    case 'file':
      stream = fs.createReadStream(url.substr(protocolMatch[0].length), { encoding: 'utf8' });
      break;
    default:
      stream = new EventEmitter();
      setImmediate(() => {
        stream.emit('error', new Error('Unknown protocol: ' + protocolMatch[1]));
      });
    }

    // If the stream has no other error handlers attached (besides this one),
    // emit the stream error as a datasource error
    stream.on('error', (error: Error) => {
      if (stream.listenerCount('error') === 1)
        this.emit('error', error);
    });
    return stream;
  }

  // Closes the data source, freeing possible resources used
  close(callback?: () => void) {
    callback && callback();
  }
}


export = Datasource;
