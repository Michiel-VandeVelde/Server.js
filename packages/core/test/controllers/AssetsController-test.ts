/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
import { AssetsController } from '@ldf/core/lib/controllers';
import { UrlData } from '@ldf/core/lib/UrlData';
import * as request from 'supertest';
import { DummyServer } from '../../../../test/DummyServer';
import type { DummyController } from '../../../../test/DummyServer';
import type { SinonSpyLike } from '../../../../test/sinon-types';
import * as fs from 'fs';
import * as path from 'path';

type SpiedController = AssetsController & DummyController & { next: SinonSpyLike };

describe('AssetsController', () => {
  describe('The AssetsController module', () => {
    it('should be a function', () => {
      expect(typeof AssetsController).toBe('function');
    });

    it('should be an AssetsController constructor', () => {
      expect(new AssetsController()).toBeInstanceOf(AssetsController);
    });

    it('should use the assets path from a given urlData', () => {
      let controller = new AssetsController({ urlData: new UrlData({ assetsPath: '/static/' }) });
      return request.agent(DummyServer(controller)).get('/static/images/logo').expect((response: request.Response) => {
        expect(response).toHaveProperty('statusCode', 200);
      });
    });
  });

  describe('An AssetsController instance', () => {
    let controller: SpiedController, client: request.Agent;
    beforeAll(() => {
      controller = new AssetsController() as SpiedController;
      client = request.agent(DummyServer(controller));
    });

    it('should correctly serve SVG assets', () => {
      return client.get('/assets/images/logo').expect((response: request.Response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/svg+xml');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      });
    });

    it('should correctly serve CSS assets', () => {
      return client.get('/assets/styles/ldf-server').expect((response: request.Response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'text/css;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response).toHaveProperty('text', asset);
      });
    });

    it('should correctly serve ICO assets', () => {
      return client.get('/favicon.ico').expect((response: request.Response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/vnd.microsoft.icon');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      });
    });

    it('should hand over to the next controller if no asset with that name is found', () => {
      return client.get('/assets/unknown').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });

    it('should hand over to the next controller for non-asset paths', () => {
      return client.get('/other').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });
});
