/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
// The exported class is actually named `DeferenceController` (pre-existing
// typo in the library source, preserved as-is) — aliased here for readability.
import { DeferenceController as DereferenceController } from '../../lib/controllers/DereferenceController';
import * as request from 'supertest';
import { DummyServer, type DummyController } from '../../../../test/DummyServer';
import type { SinonSpyLike } from '../../../../test/sinon-types';
import type * as supertestModule from 'supertest';
import type { ClientRequest } from 'http';
import type { Datasource } from '../../lib/datasources/Datasource';

type SpiedController = DereferenceController & DummyController & { next: SinonSpyLike };
// supertest's Response type doesn't declare `.req` (the underlying raw
// http.ClientRequest), though it exists at runtime.
type ResponseWithReq = supertestModule.Response & { req: ClientRequest };

describe('DereferenceController', () => {
  describe('The DereferenceController module', () => {
    it('should be a function', () => {
      expect(typeof DereferenceController).toBe('function');
    });

    it('should be a DereferenceController constructor', () => {
      expect(new DereferenceController()).toBeInstanceOf(DereferenceController);
    });
  });

  describe('A DereferenceController instance', () => {
    let controller: SpiedController, client: request.Agent;
    beforeAll(() => {
      controller = new DereferenceController({ dereference: { '/resource/': { path: 'dbpedia/2014' } as Datasource } }) as SpiedController;
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request for a dereferenced URL', () => {
      let response: supertestModule.Response;
      beforeAll(() => new Promise<void>((resolve, reject) => {
        void client.get('/resource/Mickey_Mouse')
          .end((error, res) => { response = res; error ? reject(error) : resolve(); });
      }));

      it('should not hand over to the next controller', () => {
        expect(controller.next.called).toBe(false);
      });

      it('should set the status code to 303', () => {
        expect(response).toHaveProperty('statusCode', 303);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', () => {
        let hostname = (response as ResponseWithReq).req.getHeader('Host') as string,
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(response.headers).toHaveProperty('location', expectedLocation);
      });

      it('should mention the desired location in the body', () => {
        let hostname = (response as ResponseWithReq).req.getHeader('Host') as string,
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(response.text).toContain(expectedLocation);
      });
    });

    describe('receiving a request for a non-defererenced URL', () => {
      beforeAll(() => new Promise<void>((resolve, reject) => {
        void client.get('/otherresource/Mickey_Mouse').end((err) => err ? reject(err) : resolve());
      }));

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });
});
