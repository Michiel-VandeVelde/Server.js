/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
import { SummaryController } from '@ldf/feature-summary/lib/controllers';
import { DummyServer } from '../../../../test/DummyServer';
import * as fs from 'fs';
import * as path from 'path';
import { SummaryRdfView } from '@ldf/feature-summary/lib/views/summary';
import { DataFactory as dataFactory } from 'n3';

interface SupertestResponse {
  statusCode: number;
  headers: Record<string, string>;
  text: string;
}
interface SupertestChainable {
  set(header: string, value: string): SupertestChainable;
  expect(callback: (response: SupertestResponse) => void): SupertestChainable;
  end(callback: (error: Error | null) => void): void;
}
interface SupertestAgent {
  get(path: string): SupertestChainable;
}
interface SupertestStatic {
  agent(server: unknown): SupertestAgent;
}
const request = require('supertest') as SupertestStatic;

interface FakeController {
  next: { calledOnce: boolean; called: boolean };
}

describe('SummaryController', () => {
  describe('The SummaryController module', () => {
    it('should be a function', () => {
      expect(typeof SummaryController).toBe('function');
    });

    it('should be an SummaryController constructor', () => {
      expect(new SummaryController()).toBeInstanceOf(SummaryController);
    });

    it('should create new SummaryController objects', () => {
      expect(new SummaryController()).toBeInstanceOf(SummaryController);
    });
  });

  describe('An SummaryController instance', () => {
    let controller: SummaryController & FakeController, client: SupertestAgent;
    beforeAll(() => {
      controller = new SummaryController({
        views: [new SummaryRdfView({ dataFactory })],
        summaries: { dir: path.join(__dirname, '/../../../../test/assets') },
        prefixes: {
          ds: 'http://semweb.mmlab.be/ns/datasummaries#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      } as any) as SummaryController & FakeController;
      client = request.agent(DummyServer(controller as any));
    });

    it('should correctly serve summary in Turtle', () => new Promise<void>((done) => {
      client.get('/summaries/summary').set('Accept', 'text/turtle').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'text/turtle;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=604800');
        expect(response.text).toBe(summary);
      }).end(() => done());
    }));

    it('should correctly serve summary in Trig', () => new Promise<void>((done) => {
      client.get('/summaries/summary').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'application/trig;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=604800');
        expect(response.text).toBe(summary);
      }).end(() => done());
    }));

    it('should correctly serve summary in ntriples', () => new Promise<void>((done) => {
      client.get('/summaries/summary').set('Accept', 'application/n-triples').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.nt'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'application/n-triples;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=604800');
        expect(response.text).toBe(summary);
      }).end(() => done());
    }));

    it('should hand over to the next controller if no summary with that name is found', () => new Promise<void>((done) => {
      client.get('/summaries/unknown').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      }).end(() => done());
    }));

    it('should hand over to the next controller for non-summary paths', () => new Promise<void>((done) => {
      client.get('/other').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      }).end(() => done());
    }));
  });
});
