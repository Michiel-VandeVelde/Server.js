/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
import { Controller } from '@ldf/core/lib/controllers';
import { UrlData } from '@ldf/core/lib/UrlData';
import * as http from 'http';
import * as request from 'supertest';
import { DummyServer } from '../../../../test/DummyServer';
import type { DummyController } from '../../../../test/DummyServer';
import { sinon } from '../../../../test/sinon';
import type { SinonSpyLike } from '../../../../test/sinon-types';

type SpiedController = Controller & DummyController & { next: SinonSpyLike };

describe('Controller', () => {
  describe('The Controller module', () => {
    it('should be a function', () => {
      expect(typeof Controller).toBe('function');
    });

    it('should be a Controller constructor', () => {
      expect(new Controller()).toBeInstanceOf(Controller);
    });
  });

  describe('A Controller instance without baseURL', () => {
    let controller: SpiedController, client: request.Agent, handleRequest: SinonSpyLike;
    beforeAll(() => {
      controller = new Controller() as SpiedController;
      handleRequest = sinon.spy(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client.get('/path?a=b'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let args = handleRequest.getCall(0).args;
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let request = handleRequest.getCall(0).args[0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'http:', host: request.headers.host, hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });

  describe('A Controller instance without baseURL using Forwarded header', () => {
    let controller: SpiedController, client: request.Agent, handleRequest: SinonSpyLike;
    beforeAll(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) }) as SpiedController;
      handleRequest = sinon.spy(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client
        .get('/path?a=b')
        .set('X-Forwarded-Host', 'foo:5000')
        // NOTE: the priority will go to the Forwarded header over the X-Forwarded-Host header
        .set('Forwarded', 'proto=https;host="bar:8000"'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let args = handleRequest.getCall(0).args;
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let request = handleRequest.getCall(0).args[0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'https:', host: 'bar:8000', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });

    describe('receiving a request with a malformed Forwarded header', () => {
      beforeAll(() => client
        .get('/path?a=b')
        .set('Forwarded', 'proto="unterminated'));

      it('should fall back to the request\'s own information', () => {
        let request = handleRequest.getCall(handleRequest.callCount - 1).args[0];
        expect(request.parsedUrl).toHaveProperty('protocol', 'http:');
      });
    });
  });

  describe('A Controller instance without baseURL using X-Forwarded-* headers', () => {
    let controller: SpiedController, client: request.Agent, handleRequest: SinonSpyLike;
    beforeAll(() => {
      controller = new Controller() as SpiedController;
      handleRequest = sinon.spy(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client
        .get('/path?a=b')
        .set('X-Forwarded-Host', 'foo:5000')
        .set('X-Forwarded-Proto', 'https'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let args = handleRequest.getCall(0).args;
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let request = handleRequest.getCall(0).args[0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'https:', host: 'foo:5000', hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });

  describe('A Controller instance with baseURL', () => {
    let controller: SpiedController, client: request.Agent, handleRequest: SinonSpyLike;
    beforeAll(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) }) as SpiedController;
      handleRequest = sinon.spy(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client.get('/path?a=b'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let args = handleRequest.getCall(0).args;
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', () => {
        expect(handleRequest.calledOnce).toBe(true);
        let request = handleRequest.getCall(0).args[0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'http:', host: 'example.org:1234', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });
});
