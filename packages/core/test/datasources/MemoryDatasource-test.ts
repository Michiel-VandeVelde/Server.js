/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
import { describe, it, expect } from 'vitest';
import { MemoryDatasource } from '../../lib/datasources/MemoryDatasource';
import { Datasource } from '../../lib/datasources/Datasource';
import * as N3 from 'n3';
import type { Quad } from 'rdf-js';

const dataFactory = N3.DataFactory;

describe('MemoryDatasource', () => {
  describe('The MemoryDatasource module', () => {
    it('should be a function', () => {
      expect(typeof MemoryDatasource).toBe('function');
    });

    it('should be a MemoryDatasource constructor', () => {
      expect(new MemoryDatasource({ dataFactory })).toBeInstanceOf(MemoryDatasource);
    });

    it('should be a Datasource constructor', () => {
      expect(new MemoryDatasource({ dataFactory })).toBeInstanceOf(Datasource);
    });
  });

  describe('A MemoryDatasource instance with a bare file path', () => {
    it('should prepend the file:// protocol', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: '/tmp/example.ttl' }) as any;
      expect(datasource._url).toBe('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance with an already-prefixed file path', () => {
    it('should leave the protocol untouched', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: 'file:///tmp/example.ttl' }) as any;
      expect(datasource._url).toBe('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance without an overridden _getAllQuads', () => {
    it('should error when initialized', () => new Promise<void>((done) => {
      let datasource = new MemoryDatasource({ dataFactory });
      datasource.on('error', (error: Error) => {
        expect(error.message).toBe('_getAllQuads is not implemented');
        done();
      });
      datasource.initialize();
    }));
  });

  describe('A MemoryDatasource subclass whose _getAllQuads errors', () => {
    class FailingDatasource extends MemoryDatasource {
      protected override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
        done(new Error('could not read quads'));
      }
    }

    it('should error when initialized', () => new Promise<void>((done) => {
      let datasource = new FailingDatasource({ dataFactory });
      datasource.on('error', (error: Error) => {
        expect(error.message).toBe('could not read quads');
        done();
      });
      datasource.initialize();
    }));
  });
});
