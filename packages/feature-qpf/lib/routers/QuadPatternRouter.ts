/*! @license MIT ©2014–17 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/** A QuadPatternRouter routes basic quad patterns */

import { stringToTerm } from 'rdf-string';
import type { DataFactoryInterface } from 'n3';
import type { Query, RouterRequest } from '@ldf/core/lib/types';

let iriMatcher = /^(<?)([^_?$"<>][^"<>]*)>?$/;
let literalMatcher = /^("[^]*")(?:|\^\^<?([^"<>]+)>?|@[a-z0-9\-]+)$/i;
let prefixedNameMatcher = /^([a-z0-9\-]*):([^\/#:]*)$/i;

// Clients use `DEFAULT_GRAPH` as value for `graph` to indicate the default graph
let DEFAULT_GRAPH = 'urn:ldf:defaultGraph';
// However, users might find "@default" easier to type (not spec-compatible)
let DEFAULT_GRAPH_ALT = '@default';

// Creates a new QuadPatternRouter
class QuadPatternRouter {
  private _prefixes: Record<string, string>;
  private dataFactory?: DataFactoryInterface;

  constructor(config: { prefixes?: Record<string, string>; dataFactory?: DataFactoryInterface }) {
    this._prefixes = config.prefixes || {};
    this.dataFactory = config.dataFactory;
  }

  // Extracts triple or quad pattern parameters from the request and add them to the query
  extractQueryParams(request: RouterRequest, query: Query) {
    let queryString = (request.url && request.url.query)!, match,
        hasTriplePattern: Query['subject'] | Query['predicate'] | Query['object'] | false = false,
        hasQuadPattern: string | false = false;

    // Try to extract a subject IRI
    if (queryString.subject && (match = iriMatcher.exec(queryString.subject as string)))
      hasTriplePattern = query.subject = stringToTerm(match[1] ? match[2] : this._expandIRI(match[2]), this.dataFactory) as Query['subject'];

    // Try to extract a predicate IRI
    if (queryString.predicate && (match = iriMatcher.exec(queryString.predicate as string)))
      hasTriplePattern = query.predicate = stringToTerm(match[1] ? match[2] : this._expandIRI(match[2]), this.dataFactory) as Query['predicate'];

    // Try to extract an object
    if (queryString.object) {
      // The object can be an IRI…
      if (match = iriMatcher.exec(queryString.object as string))
        hasTriplePattern = query.object = stringToTerm(match[1] ? match[2] : this._expandIRI(match[2]), this.dataFactory) as Query['object'];
      // or the object can be a literal (with a type or language)
      else if (match = literalMatcher.exec(queryString.object as string))
        hasTriplePattern = query.object = stringToTerm(match[2] ? match[1] + '^^' + this._expandIRI(match[2]) : match[0], this.dataFactory) as Query['object'];
    }

    // Try to extract a graph IRI
    if (queryString.graph && (match = iriMatcher.exec(queryString.graph as string))) {
      hasTriplePattern = false;
      hasQuadPattern = match[1] ? match[2] : this._expandIRI(match[2]);
      // When a client specifies DEFAULT_GRAPH as graph,
      // we search the actual default graph rather than the graph with that name.
      if (hasQuadPattern === DEFAULT_GRAPH || hasQuadPattern === DEFAULT_GRAPH_ALT)
        query.graph = stringToTerm('', this.dataFactory) as Query['graph'];
      else
        query.graph = stringToTerm(hasQuadPattern, this.dataFactory) as Query['graph'];
    }

    // Indicate in the query whether the triple/quad pattern feature was used
    if (hasTriplePattern !== false)
      (query.features || (query.features = {})).triplePattern = true;
    if (hasQuadPattern !== false)
      (query.features || (query.features = {})).quadPattern = true;
  }

  // Expands a prefixed named into a full IRI
  _expandIRI(name: string) {
    let match = prefixedNameMatcher.exec(name), prefix;
    return match && (prefix = this._prefixes[match[1]]) ? prefix + match[2] : name;
  }
}

export = QuadPatternRouter;
