/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
import { describe, it, expect } from 'vitest';
import { MementoControllerExtension } from '@ldf/feature-memento/lib/controllers';
import { Controller } from '@ldf/core/lib/controllers';
import { UrlData } from '@ldf/core/lib/UrlData';
import * as url from 'url';
import { sinon } from '../../../../test/sinon';
import type { LdfRequest, LdfResponse } from '@ldf/core';
import type { Datasource } from '@ldf/core/lib/datasources/Datasource';
import type { DatasourceRef, MementoRequestSettings } from '@ldf/feature-memento/lib/controllers/TimegateController';

class TestableMementoControllerExtension extends MementoControllerExtension {
  callHandleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings: MementoRequestSettings) {
    return this._handleRequest(request, response, next, settings);
  }
}

describe('MementoControllerExtension', () => {
  describe('The MementoControllerExtension module', () => {
    it('should be a function', () => {
      expect(typeof MementoControllerExtension).toBe('function');
    });

    it('should be a MementoControllerExtension constructor', () => {
      expect(new MementoControllerExtension({ urlData: new UrlData() })).toBeInstanceOf(MementoControllerExtension);
    });

    it('should be a Controller constructor', () => {
      expect(new MementoControllerExtension({ urlData: new UrlData() })).toBeInstanceOf(Controller);
    });
  });

  describe('An instance for a datasource with a memento configured', () => {
    let datasource = { id: 'ds1', path: '/ds1/' };
    let extension = new TestableMementoControllerExtension({
      urlData: new UrlData({ baseURL: 'http://example.org/' }),
      timegates: {
        mementos: {
          resource: [{ datasource: datasource as unknown as Datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
        },
      },
    });

    it('should add original and timegate links for a request matching the memento', () => {
      let request = { url: '/ds1/?subject=x', parsedUrl: url.parse('http://example.org/ds1/?subject=x', true) } as unknown as LdfRequest,
          headers: Record<string, string> = {}, response = { setHeader: (name: string, value: string) => { headers[name] = value; } } as unknown as LdfResponse,
          settings: MementoRequestSettings = { query: {}, datasource: { id: 'ds1' } as unknown as DatasourceRef };

      extension.callHandleRequest(request, response, () => {
        expect(headers.Link).toContain('rel=original');
        expect(headers.Link).toContain('rel=timegate');
        expect(headers.Link).toContain('/timegate/resource');
        expect(headers).toHaveProperty('Memento-Datetime');
      }, settings);
    });

    it('should add a local timegate link for a non-memento resource with timegate: true', () => {
      let request = { url: '/ds2/?subject=x', parsedUrl: url.parse('http://example.org/ds2/?subject=x', true) } as unknown as LdfRequest,
          headers: Record<string, string> = {}, response = { setHeader: (name: string, value: string) => { headers[name] = value; } } as unknown as LdfResponse,
          settings: MementoRequestSettings = { query: { datasource: 'ds2' }, datasource: { id: 'ds2', timegate: true } as unknown as DatasourceRef };

      extension.callHandleRequest(request, response, () => {
        expect(headers.Link).toContain('rel=timegate');
        expect(headers.Link).toContain('/timegate/ds2');
      }, settings);
    });

    it('should use a configured external timegate URL as-is', () => {
      let request = { url: '/ds3/?subject=x', parsedUrl: url.parse('http://example.org/ds3/?subject=x', true) } as unknown as LdfRequest,
          headers: Record<string, string> = {}, response = { setHeader: (name: string, value: string) => { headers[name] = value; } } as unknown as LdfResponse,
          settings: MementoRequestSettings = { query: { datasource: 'ds3' }, datasource: { id: 'ds3', timegate: 'http://external.example.org/timegate/ds3' } as unknown as DatasourceRef };

      extension.callHandleRequest(request, response, () => {
        expect(headers.Link).toBe('<http://external.example.org/timegate/ds3?subject=x>;rel=timegate');
      }, settings);
    });

    it('should not add a Link header for a resource without a timegate configuration', () => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) } as unknown as LdfRequest,
          headers: Record<string, string> = {}, response = { setHeader: (name: string, value: string) => { headers[name] = value; } } as unknown as LdfResponse,
          settings: MementoRequestSettings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } as unknown as DatasourceRef };

      extension.callHandleRequest(request, response, () => {
        expect(headers).not.toHaveProperty('Link');
      }, settings);
    });

    it('should always hand over to the next controller', () => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) } as unknown as LdfRequest,
          response = { setHeader: () => {} } as unknown as LdfResponse,
          settings: MementoRequestSettings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } as unknown as DatasourceRef },
          next = sinon.spy();

      extension.callHandleRequest(request, response, next, settings);
      expect(next.calledOnce).toBe(true);
    });
  });
});
