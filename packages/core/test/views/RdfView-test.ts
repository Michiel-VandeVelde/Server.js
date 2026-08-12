/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
import { RdfView, View } from '@ldf/core/lib/views';
import * as N3 from 'n3';
import { PassThrough } from 'stream';
import { sinon } from '../../../../test/sinon';
import type { SinonSpyLike } from '../../../../test/sinon-types';
import type { Quad } from 'rdf-js';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '@ldf/core';
import type { Datasource } from '@ldf/core/lib/datasources/Datasource';

const dataFactory = N3.DataFactory;

class TestableRdfView extends RdfView {
  callGenerateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone) {
    return this._generateRdf(settings, data, metadata, done);
  }

  callRenderViewExtension(
    extension: View, options: ViewSettings & { writer: { data: (quad: Quad) => void; meta: (quad: Quad) => void; end: () => void } },
    request: LdfRequest, response: LdfResponse, done: RenderDone,
  ) {
    return this._renderViewExtension(extension, options, request, response, done);
  }

  callAddDatasources(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void) {
    return this._addDatasources(settings, data, metadata);
  }

  callCreateN3Writer(settings: ViewSettings, response: LdfResponse, done: RenderDone) {
    return this._createN3Writer(settings, response, done);
  }

  callCreateJsonLdWriter(settings: ViewSettings, response: LdfResponse, done: RenderDone) {
    return this._createJsonLdWriter(settings, response, done);
  }
}

describe('RdfView', () => {
  describe('The RdfView module', () => {
    it('should be a function', () => {
      expect(typeof RdfView).toBe('function');
    });

    it('should be a View subclass', () => {
      expect(RdfView.prototype instanceof View).toBe(true);
    });
  });

  describe('An RdfView instance', () => {
    describe('without a _generateRdf implementation', () => {
      it('should throw an error when calling _generateRdf', () => {
        expect(() => { new TestableRdfView('', { dataFactory }).callGenerateRdf({}, noop, noop, noop); })
          .toThrow('The _generateRdf method is not yet implemented.');
      });
    });

    describe('_renderViewExtension', () => {
      it('should call _generateRdf on an extension that implements it', () => {
        let extension = { _generateRdf: sinon.spy() } as unknown as View,
            view = new TestableRdfView('', { dataFactory }),
            options = { writer: { data: noop, meta: noop, end: noop } }, done = noop;
        view.callRenderViewExtension(extension, options, {} as LdfRequest, {} as LdfResponse, done);
        expect((extension as unknown as { _generateRdf: SinonSpyLike })._generateRdf.calledOnce).toBe(true);
        expect((extension as unknown as { _generateRdf: SinonSpyLike })._generateRdf
          .calledWith(options, options.writer.data, options.writer.meta, done)).toBe(true);
      });

      it('should do nothing for an extension that does not implement _generateRdf', () => {
        let extension = {} as unknown as View,
            view = new TestableRdfView('', { dataFactory }),
            options = { writer: { data: noop, meta: noop, end: noop } };
        expect(() => { view.callRenderViewExtension(extension, options, {} as LdfRequest, {} as LdfResponse, noop); }).not.toThrow();
      });
    });

    describe('_addDatasources', () => {
      it('should skip datasources without a url', () => {
        let view = new TestableRdfView('', { dataFactory }), metadata = sinon.spy();
        view.callAddDatasources({ datasources: { a: { title: 'no-url datasource' } as unknown as Datasource } }, noop, metadata);
        expect(metadata.called).toBe(false);
      });
    });

    describe('_createN3Writer', () => {
      it('should preserve a metadata quad\'s own non-default graph', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), written = '';
        let response = { write: (data: string) => { written += data; } } as unknown as LdfResponse;
        let writer = view.callCreateN3Writer(
          { contentType: 'application/trig', metadataGraph: 'urn:meta', fragmentUrl: 'urn:frag', prefixes: {} },
          response, () => {
            expect(written).toContain('urn:owngraph');
            done();
          });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.namedNode('urn:owngraph')));
        writer.end();
      }));

      it('should write nothing when the underlying N3 writer errors', () => new Promise<void>((done) => {
        let originalEnd = N3.Writer.prototype.end;
        N3.Writer.prototype.end = function (callback: (error: Error | null, result?: string) => void) { callback(new Error('failed')); };
        try {
          let view = new TestableRdfView('', { dataFactory }), written: string;
          let response = { write: (data: string) => { written = data; } } as unknown as LdfResponse;
          let writer = view.callCreateN3Writer({ contentType: 'text/turtle', prefixes: {} }, response, () => {
            expect(written).toBe('');
            done();
          });
          writer.end();
        }
        finally { N3.Writer.prototype.end = originalEnd; }
      }));
    });

    describe('_createJsonLdWriter', () => {
      function collect() {
        let response = new PassThrough(), output = '';
        response.on('data', (d) => { output += d; });
        return { response: response as unknown as LdfResponse, getOutput: () => output };
      }

      it('should not set @base when the prefixes have no base entry', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view.callCreateJsonLdWriter({ prefixes: {} }, response, () => {
          expect(JSON.parse(getOutput())['@context']).not.toHaveProperty('@base');
          done();
        });
        writer.end();
      }));

      it('should set @base when the prefixes have a base entry', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view.callCreateJsonLdWriter({ prefixes: { '': 'http://example.org/' } }, response, () => {
          expect(JSON.parse(getOutput())['@context']).toHaveProperty('@base', 'http://example.org/');
          done();
        });
        writer.end();
      }));

      it('should preserve a metadata quad\'s own non-default graph', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view.callCreateJsonLdWriter({ prefixes: {} }, response, () => {
          expect(getOutput()).toContain('urn:owngraph');
          done();
        });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.namedNode('urn:owngraph')));
        writer.end();
      }));

      it('should use the default graph for default-graph metadata when no metadataGraph is set', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view.callCreateJsonLdWriter({ prefixes: {}, metadataGraph: undefined }, response, () => {
          let parsed = JSON.parse(getOutput());
          expect(parsed['@graph'][0]).toHaveProperty('@id', 'urn:s');
          done();
        });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.defaultGraph()));
        writer.end();
      }));

      it('should call back with an error when the underlying JSON-LD serializer errors', () => new Promise<void>((done) => {
        let view = new TestableRdfView('', { dataFactory }), { response } = collect(), callCount = 0;
        let writer = view.callCreateJsonLdWriter({ prefixes: {} }, response, (error?: Error | null) => {
          if (callCount++ === 0) {
            expect(error!.message).toContain('Invalid JSON literal');
            done();
          }
        });
        writer.data(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'),
          dataFactory.literal('not valid json', dataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON'))));
      }));
    });
  });
});

function noop() {}
