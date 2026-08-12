/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JsonLdDatasource } from '@ldf/datasource-jsonld/lib/datasources';
import { Datasource } from '@ldf/core/lib/datasources';
import * as path from 'path';
import * as N3 from 'n3';
import type { Query } from '@ldf/core';

const dataFactory = N3.DataFactory;

let exampleJsonLdUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.jsonld');

describe('JsonLdDatasource', () => {
  describe('The JsonLdDatasource module', () => {
    it('should be a function', () => {
      expect(typeof JsonLdDatasource).toBe('function');
    });

    it('should be a JsonLdDatasource constructor', () => new Promise<void>((done) => {
      let instance = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
      expect(instance).toBeInstanceOf(JsonLdDatasource);
      instance.close(() => done());
    }));

    it('should create Datasource objects', () => new Promise<void>((done) => {
      let instance = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
      expect(instance).toBeInstanceOf(Datasource);
      instance.close(() => done());
    }));
  });

  describe('A JsonLdDatasource instance for an example JsonLd file', () => {
    let datasource = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
    beforeAll(() => new Promise<void>((done) => {
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise<void>((done) => { datasource.close(() => done()); }));

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

    itShouldExecute(datasource,
      'a query for an existing graph',
      { graph: dataFactory.namedNode('http://example.org/g'),      limit: 10, features: { quadPattern: true, limit: true } },
      10, 10);

    itShouldExecute(datasource,
      'a query for a non-existing graph',
      { graph: dataFactory.namedNode('http://example.org/s1'),     limit: 10, features: { quadPattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(datasource: JsonLdDatasource, name: string, query: Query, expectedResultsCount: number, expectedTotalCount: number) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount: number;
    beforeAll(() => new Promise<void>((done) => {
      let result = datasource.select(query);
      result.getProperty<{ totalCount: number }>('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', () => { resultsCount++; });
      result.on('end', done);
    }));

    it('should return the expected number of triples', () => {
      expect(resultsCount).toBe(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).toBe(expectedTotalCount);
    });
  });
}
