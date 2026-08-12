/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
import { DatasourceRouter } from '@ldf/core/lib/routers';
import { extractQueryParams } from '../../../../test/test-helpers';
import type { UrlData } from '@ldf/core/lib/UrlData';
type LooseQuery = Record<string, unknown>;

describe('DatasourceRouter', () => {
  describe('The DatasourceRouter module', () => {
    it('should be a function', () => {
      expect(typeof DatasourceRouter).toBe('function');
    });

    it('should be a DatasourceRouter constructor', () => {
      expect(new DatasourceRouter()).toBeInstanceOf(DatasourceRouter);
    });
  });

  describe('A DatasourceRouter instance', () => {
    let router = new DatasourceRouter();

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        ([
          [
            'a root URL without trailing slash or query parameters',
            'http://example.org',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL without query parameters',
            'http://example.org/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL with query parameters',
            'http://example.org/?a=b&c=d',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a URL with word characters without query parameters',
            'http://example.org/mydatasource',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word characters with query parameters',
            'http://example.org/mydatasource?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word and non-word characters without query parameters',
            'http://example.org/my/data-source',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
          [
            'a URL with word and non-word characters with query parameters',
            'http://example.org/my/data-source?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
        ] as [string, string, string, LooseQuery, LooseQuery][])
          .forEach(([description, url, intent, query, expectedQuery]) => {
            extractQueryParams(router, description, url, intent, query, expectedQuery);
          });
      });
    });
  });

  describe('A DatasourceRouter instance with a base URL', () => {
    let router = new DatasourceRouter({
      urlData: { baseURLPath: '/my/base/' } as UrlData,
    });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        ([
          [
            'a root URL',
            'http://example.org/my/base/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a non-root URL',
            'http://example.org/my/base/other/path',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/other/path' },
          ],
        ] as [string, string, string, LooseQuery, LooseQuery][])
          .forEach(([description, url, intent, query, expectedQuery]) => {
            extractQueryParams(router, description, url, intent, query, expectedQuery);
          });
      });
    });
  });
});
