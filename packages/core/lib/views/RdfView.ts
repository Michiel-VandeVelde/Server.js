/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate RDF responses. */

import View = require('./View');
import * as N3 from 'n3';
import { JsonLdSerializer } from 'jsonld-streaming-serializer';
import _ = require('lodash');
import type { LdfRequest, LdfResponse, RenderDone } from '../types';

// The minimal duck-typed interface both writer factories below produce.
interface RdfWriter {
  data(quad: N3.Quad): void;
  meta(quad: N3.Quad): void;
  end(): void;
}

let dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

let primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

let contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' +
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,application/n-triples;q=0.5,text/n3;q=0.6';

// Creates a new RDF view with the given name and settings
class RdfView extends View {
  constructor(viewName?: string, settings?: Record<string, any>) {
    super(viewName, contentTypes, settings);
  }

  // Renders the view with the given settings to the response
  override _render(settings: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone) {
    // Add generic writer settings
    settings.fragmentUrl = settings.fragment && settings.fragment.url || '';
    settings.metadataGraph = settings.fragmentUrl + '#metadata';
    settings.contentType = response.getHeader('Content-Type');

    // Write the triples with a content-type-specific writer
    let self = this,
        writer: RdfWriter = /json/.test(settings.contentType) ? this._createJsonLdWriter(settings, response, done)
          : this._createN3Writer(settings, response, done);
    settings.writer = writer;
    function main()   { self._generateRdf(settings, writer.data, writer.meta, after); }
    function after()  { self._renderViewExtensions('After',  settings, request, response, writer.end); }
    function before() { self._renderViewExtensions('Before', settings, request, response, main); }
    before();
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings: Record<string, any>, data: (quad: N3.Quad) => void, metadata: (quad: N3.Quad) => void, done: RenderDone) {
    throw new Error('The _generateRdf method is not yet implemented.');
  }

  // Renders the specified view extension
  override _renderViewExtension(extension: any, options: Record<string, any>, request: LdfRequest, response: LdfResponse, done: RenderDone) {
    // only view extensions that generate triples are supported
    if (extension._generateRdf)
      extension._generateRdf(options, options.writer.data, options.writer.meta, done);
  }

  // Adds details about the datasources
  _addDatasources(settings: Record<string, any>, data: (quad: N3.Quad) => void, metadata: (quad: N3.Quad) => void) {
    let datasources = settings.datasources;
    for (let datasourceName in datasources) {
      let datasource = datasources[datasourceName];
      if (datasource.url) {
        const quad = this.dataFactory!.quad, namedNode = this.dataFactory!.namedNode, literal = this.dataFactory!.literal;
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(voID  + 'Dataset')));
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(hydra + 'Collection')));
        metadata(quad(namedNode(datasource.url), namedNode(dcTerms + 'title'), literal('"' + datasource.title + '"', 'en')));
      }
    }
  }

  // Creates a writer for Turtle/N-Triples/TriG/N-Quads
  _createN3Writer(settings: Record<string, any>, response: LdfResponse, done: RenderDone): RdfWriter {
    let writer = new N3.Writer({ format: settings.contentType, prefixes: settings.prefixes }),
        supportsGraphs = /trig|quad/.test(settings.contentType), metadataGraph: string | undefined;

    const dataFactory = this.dataFactory!;
    return {
      // Adds the data quad to the output
      // NOTE: The first parameter can also be a quad object
      data: function (quad: N3.Quad) {
        writer.addQuad(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad: N3.Quad) {
        // Relate the metadata graph to the data.
        if (supportsGraphs && !metadataGraph) {
          metadataGraph = settings.metadataGraph;
          writer.addQuad(dataFactory.namedNode(metadataGraph!), dataFactory.namedNode(primaryTopic), dataFactory.namedNode(settings.fragmentUrl), dataFactory.namedNode(metadataGraph!));
        }
        const graph = quad.graph.termType === 'DefaultGraph' ? (metadataGraph ? dataFactory.namedNode(metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        writer.addQuad(dataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
      },
      // Ends the output and flushes the stream
      end: function () {
        writer.end((error, output) => {
          response.write(error ? '' : output);
          done();
        });
      },
    };
  }

  // Creates a writer for JSON-LD
  _createJsonLdWriter(settings: Record<string, any>, response: LdfResponse, done: RenderDone): RdfWriter {
    let prefixes = settings.prefixes || {}, context = _.omit(prefixes, ''), base = prefixes[''];
    base && (context['@base'] = base);
    const mySerializer = new JsonLdSerializer({ space: '  ', context: context, baseIRI: prefixes[''], useNativeTypes: true })
      .on('error', done);
    mySerializer.pipe(response);
    mySerializer.on('error', (e => done(e)));
    mySerializer.on('end', (e => done(null)));

    const dataFactory = this.dataFactory!;
    return {
      // Adds the data triple to the output
      data: function (quad: N3.Quad) {
        mySerializer.write(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad: N3.Quad) {
        const graph = quad.graph.termType === 'DefaultGraph' ? (settings.metadataGraph  ? dataFactory.namedNode(settings.metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        mySerializer.write(dataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
      },
      // Ends the output and flushes the stream
      end: function () {
        // We need to wait for the serializer stream to end before calling done()
        mySerializer.end();
      },
    };
  }
}

export = RdfView;
