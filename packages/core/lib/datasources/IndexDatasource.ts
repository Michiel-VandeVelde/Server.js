/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An IndexDatasource is a datasource that lists other data sources. */

import MemoryDatasource = require('./MemoryDatasource');
import type Datasource = require('./Datasource');
import type { Quad } from 'n3';
import type { IndexDatasourceOptions } from '../types';

let rdf  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    dc   = 'http://purl.org/dc/terms/',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new IndexDatasource
class IndexDatasource extends MemoryDatasource {
  public role: string;
  protected _datasources?: Record<string, Datasource>;

  constructor(options?: IndexDatasourceOptions) {
    super(options);
    this._datasources = options ? options.datasources : {};
    this.role = 'index';
    delete this._datasources!['/'];
  }

  // Creates quads for each data source
  override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void) {
    const dataFactory = this.dataFactory!;
    const quad = dataFactory.quad, namedNode = dataFactory.namedNode, literal = dataFactory.literal;
    for (let name in this._datasources)  {
      let datasource = this._datasources![name], datasourceUrl = datasource.url;
      if (!datasource.hide && datasourceUrl) {
        addQuad(quad(namedNode(datasourceUrl), namedNode(rdf + 'type'), namedNode(voID + 'Dataset')));
        datasource.title && addQuad(quad(namedNode(datasourceUrl), namedNode(rdfs + 'label'), literal(datasource.title)));
        datasource.title && addQuad(quad(namedNode(datasourceUrl), namedNode(dc + 'title'), literal(datasource.title)));
        datasource.description && addQuad(quad(namedNode(datasourceUrl), namedNode(dc + 'description'), literal(datasource.description)));
      }
    }
    delete this._datasources;
    done();
  }
}

export = IndexDatasource;
