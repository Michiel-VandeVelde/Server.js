/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
import ThisPackage = require('../../');
import LdfCore = require('@ldf/core');
import * as path from 'path';
import * as N3 from 'n3';

const N3Datasource = ThisPackage.datasources.N3Datasource;
const Datasource = LdfCore.datasources.Datasource;
const dataFactory = N3.DataFactory;

let exampleTurtleUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.ttl');

describe('N3Datasource', () => {
  describe('The N3Datasource module', () => {
    it('should be a function', () => {
      N3Datasource.should.be.a('function');
    });

    it('should be a N3Datasource constructor', (done) => {
      let instance = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
      instance.should.be.an.instanceof(N3Datasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A N3Datasource instance for an example Turtle file', () => {
    let datasource = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
    datasource.initialize();
    after((done) => { datasource.close(done); });

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      129, 129);

    itShouldExecute(datasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 129);

    itShouldExecute(datasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      119, 129);

    itShouldExecute(datasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(datasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 110);

    itShouldExecute(datasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      3, 3);

    itShouldExecute(datasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(datasource: any, name: any, query: any, expectedResultsCount: any, expectedTotalCount: any) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount: any;
    before((done) => {
      let result = datasource.select(query);
      result.getProperty('metadata', (metadata: any) => { totalCount = metadata.totalCount; });
      result.on('data', (triple: any) => { resultsCount++; });
      result.on('end', done);
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).to.equal(expectedTotalCount);
    });
  });
}
