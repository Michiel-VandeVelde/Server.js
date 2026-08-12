/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
import { QuadPatternFragmentsController } from '../../lib/controllers/QuadPatternFragmentsController';
import { QuadPatternFragmentsHtmlView } from '../../lib/views/quadpatternfragments/QuadPatternFragmentsHtmlView';
import { QuadPatternFragmentsRdfView } from '../../lib/views/quadpatternfragments/QuadPatternFragmentsRdfView';

import * as request from 'supertest';
import * as http from 'http';
import { UrlData } from '@ldf/core';
import * as N3 from 'n3';
import { sinon } from '../../../../test/sinon';
import { DummyServer, type DummyController } from '../../../../test/DummyServer';

const dataFactory = N3.DataFactory;

describe('QuadPatternFragmentsController', () => {
  describe('The QuadPatternFragmentsController module', () => {
    it('should be a function', () => {
      expect(typeof QuadPatternFragmentsController).toBe('function');
    });

    it('should be a QuadPatternFragmentsController constructor', () => {
      expect(new QuadPatternFragmentsController()).toBeInstanceOf(QuadPatternFragmentsController);
    });
  });

  describe('A QuadPatternFragmentsController instance with 3 routers', () => {
    let controller: QuadPatternFragmentsController & DummyController, client: ReturnType<typeof request.agent>;
    let routerA: any, routerB: any, routerC: any, datasource: any, datasources: any, view: QuadPatternFragmentsRdfView, prefixes: any;
    beforeAll(() => {
      routerA = { extractQueryParams: sinon.stub() };
      routerB = { extractQueryParams: sinon.stub().throws(new Error('second router error')) };
      routerC = {
        extractQueryParams: sinon.spy((req: any, query: any) => {
          query.features.datasource = true;
          query.features.other = true;
          query.datasource = '/my-datasource';
          query.other = 'other';
        }),
      };
      datasource = {
        title: 'My data',
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({ stream: 'items' }),
        supportedFeatures: { quadPattern: true },
      };
      datasources = { 'my-datasource': datasource };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      sinon.spy(view, 'render');
      prefixes = { a: 'a' };
      controller = new QuadPatternFragmentsController({
        urlData: new UrlData({ baseURL: 'https://example.org/base/?bar=foo' }),
        routers: [routerA, routerB, routerC],
        datasources: datasources,
        views: [view],
        prefixes: prefixes,
      } as any) as QuadPatternFragmentsController & DummyController;
      client = request.agent(DummyServer(controller));
    });
    function resetAll() {
      routerA.extractQueryParams.reset();
      routerB.extractQueryParams.reset();
      routerC.extractQueryParams.reset();
      datasource.supportsQuery.reset();
      datasource.select.reset();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource?a=b&c=d').end(() => done());
      }));

      it('should call the first router with the request and an empty query', () => {
        expect(routerA.extractQueryParams.calledOnce).toBe(true);

        let args = routerA.extractQueryParams.firstCall.args;
        expect(args[0]).toHaveProperty('url');
        expect(args[0].url).toHaveProperty('path', '/my-datasource?a=b&c=d');
        expect(args[0].url).toHaveProperty('pathname', '/my-datasource');
        expect(args[0].url).toHaveProperty('query');
        expect(args[0].url.query).toEqual({ a: 'b', c: 'd' });

        expect(typeof args[1]).toBe('object');
        expect(args[1]).toHaveProperty('features');
        expect(typeof args[1].features).toBe('object');
      });

      it('should call the second router with the same request and query', () => {
        expect(routerB.extractQueryParams.calledOnce).toBe(true);

        expect(routerB.extractQueryParams.firstCall.args[0]).toBe(
          routerA.extractQueryParams.firstCall.args[0]);
        expect(routerB.extractQueryParams.firstCall.args[1]).toBe(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should call the third router with the same request and query', () => {
        expect(routerC.extractQueryParams.calledOnce).toBe(true);

        expect(routerC.extractQueryParams.firstCall.args[0]).toBe(
          routerA.extractQueryParams.firstCall.args[0]);
        expect(routerC.extractQueryParams.firstCall.args[1]).toBe(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.supportsQuery.calledOnce).toBe(true);
        expect(datasource.supportsQuery.calledWith(query)).toBe(true);
      });

      it('should send the query to the right data source', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.select.calledOnce).toBe(true);
        expect(datasource.select.calledWith(query)).toBe(true);
      });

      it('should pass the query result to the output view', () => {
        expect((view.render as any).calledOnce).toBe(true);
        let args = (view.render as any).firstCall.args;

        expect(typeof args[0]).toBe('object'); // settings
        expect(args[1]).toBeInstanceOf(http.IncomingMessage);
        expect(args[2]).toBeInstanceOf(http.ServerResponse);
      });

      it('should pass the correct settings to the view', () => {
        expect((view.render as any).calledOnce).toBe(true);
        let query = routerC.extractQueryParams.firstCall.args[1];
        let settings = (view.render as any).firstCall.args[0];

        expect(settings.datasource).toHaveProperty('title', 'My data');
        expect(settings.datasource).toHaveProperty('index', 'https://example.org/#dataset');
        expect(settings.datasource).toHaveProperty('url', 'https://example.org/my-datasource#dataset');
        expect(settings.datasource).toHaveProperty('templateUrl', 'https://example.org/my-datasource{?subject,predicate,object,graph}');
        expect(settings.datasource).toHaveProperty('supportsQuads', true);
        expect(settings.fragment).toEqual({
          url:             'https://example.org/my-datasource?a=b&c=d',
          pageUrl:         'https://example.org/my-datasource?a=b&c=d',
          firstPageUrl:    'https://example.org/my-datasource?a=b&c=d&page=1',
          nextPageUrl:     'https://example.org/my-datasource?a=b&c=d&page=2',
          previousPageUrl: null,
        });
        expect(settings.results).toEqual({
          stream: 'items',
        });
        expect(settings.prefixes).toEqual(prefixes);
        expect(settings.query).toEqual(query);
        expect(settings.datasources).toEqual({ '/my-datasource': datasource });
        expect(query).toHaveProperty('patternString', '{ ?s ?p ?o ?g. }');
      });
    });

    describe('receiving a request for an unsupported fragment', () => {
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        datasource.supportsQuery = sinon.stub().returns(false);
        void client.get('/my-datasource?a=b&c=d').end(() => done());
      }));

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.supportsQuery.calledOnce).toBe(true);
        expect(datasource.supportsQuery.calledWith(query)).toBe(true);
      });

      it('should not send the query to the data source', () => {
        expect(datasource.select.called).toBe(false);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with 2 views', () => {
    let controller: QuadPatternFragmentsController, client: ReturnType<typeof request.agent>, htmlView: QuadPatternFragmentsHtmlView, rdfView: QuadPatternFragmentsRdfView;
    beforeAll(() => {
      let datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({
          on: (event: string, callback: (...args: any[]) => void) => {
            if (event === 'end' || event === 'metadata')
              setImmediate(callback, {});
          },
        }),
        supportedFeatures: { triplePattern: true },
      };
      let router = {
        extractQueryParams: (req: any, query: any) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      htmlView = new QuadPatternFragmentsHtmlView();
      rdfView = new QuadPatternFragmentsRdfView({ dataFactory });
      sinon.spy(htmlView, 'render');
      sinon.spy(rdfView, 'render');
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
        views: [htmlView, rdfView],
      } as any);
      client = request.agent(DummyServer(controller as any));
    });
    function resetAll() {
      (htmlView.render as any).reset();
      (rdfView.render as any).reset();
    }

    describe('receiving a request without Accept header', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should call the default view', () => {
        expect((htmlView.render as any).calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource').set('Accept', '*/*')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should call the HTML view', () => {
        expect((htmlView.render as any).calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource').set('Accept', 'text/html')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should call the HTML view', () => {
        expect((htmlView.render as any).calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource').set('Accept', 'text/turtle')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should call the Turtle view', () => {
        expect((rdfView.render as any).calledOnce).toBe(true);
      });

      it('should set the text/turtle content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource').set('Accept', 'text/n3')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should call the Turtle view', () => {
        expect((rdfView.render as any).calledOnce).toBe(true);
      });

      it('should set the text/n3 content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance without matching view', () => {
    let controller: QuadPatternFragmentsController, client: ReturnType<typeof request.agent>;
    beforeAll(() => {
      let datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
        supportedFeatures: { triplePattern: true },
      };
      let router = {
        extractQueryParams: (req: any, query: any) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
      } as any);
      client = request.agent(DummyServer(controller as any));
    });

    describe('receiving a request without Accept header', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        void client.get('/my-datasource')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should return status code 406', () => {
        expect(response).toHaveProperty('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response: any;
      beforeAll(() => new Promise<void>((done) => {
        void client.get('/my-datasource').set('Accept', 'text/html')
          .end((error: Error, res: request.Response) => { response = res; done(); });
      }));

      it('should return status code 406', () => {
        expect(response).toHaveProperty('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that synchronously errors', () => {
    let controller: QuadPatternFragmentsController & DummyController, client: ReturnType<typeof request.agent>, router: any, datasource: any, error: Error, view: QuadPatternFragmentsRdfView;
    beforeAll(() => {
      router = {
        extractQueryParams: sinon.spy((req: any, query: any) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error');
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().throws(error),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
      } as any) as QuadPatternFragmentsController & DummyController;
      client = request.agent(DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource?a=b&c=d').end(() => done());
      }));

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that asynchronously errors', () => {
    let controller: QuadPatternFragmentsController & DummyController, client: ReturnType<typeof request.agent>, router: any, datasource: any, error: Error, view: QuadPatternFragmentsRdfView;
    beforeAll(() => {
      router = {
        extractQueryParams: sinon.spy((req: any, query: any) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error');
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: (query: any, callback: (error: Error) => void) => { setImmediate(callback.bind(null, error)); },
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      view.render = sinon.stub() as any; // avoid writing a partial body
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': datasource },
      } as any) as QuadPatternFragmentsController & DummyController;
      client = request.agent(DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(() => new Promise<void>((done) => {
        resetAll();
        void client.get('/my-datasource?a=b&c=d').end(() => done());
      }));

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });
});
