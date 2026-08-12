/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, beforeAll } from 'vitest';
import { AssetsController } from '../../lib/controllers/AssetsController';
import { UrlData } from '../../lib/UrlData';
import * as request from 'supertest';
import { DummyServer, type DummyController } from '../../../../test/DummyServer';
import * as fs from 'fs';
import * as path from 'path';
import type { SinonSpyLike } from '../../../../test/sinon-types';

type SpiedController = AssetsController & DummyController & { next: SinonSpyLike };

describe('AssetsController', () => {
  describe('The AssetsController module', () => {
    it('should be a function', () => {
      expect(typeof AssetsController).toBe('function');
    });

    it('should be an AssetsController constructor', () => {
      expect(new AssetsController()).toBeInstanceOf(AssetsController);
    });

    it('should use the assets path from a given urlData', () => new Promise<void>((resolve, reject) => {
      let controller = new AssetsController({ urlData: new UrlData({ assetsPath: '/static/' }) });
      void request.agent(DummyServer(controller as unknown as DummyController)).get('/static/images/logo').expect((response) => {
        expect(response).toHaveProperty('statusCode', 200);
      }).end((err) => err ? reject(err) : resolve());
    }));
  });

  describe('An AssetsController instance', () => {
    let controller: SpiedController, client: request.Agent;
    beforeAll(() => {
      controller = new AssetsController() as SpiedController;
      client = request.agent(DummyServer(controller));
    });

    it('should correctly serve SVG assets', () => new Promise<void>((resolve, reject) => {
      void client.get('/assets/images/logo').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/svg+xml');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      }).end((err) => err ? reject(err) : resolve());
    }));

    it('should correctly serve CSS assets', () => new Promise<void>((resolve, reject) => {
      void client.get('/assets/styles/ldf-server').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'text/css;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response).toHaveProperty('text', asset);
      }).end((err) => err ? reject(err) : resolve());
    }));

    it('should correctly serve ICO assets', () => new Promise<void>((resolve, reject) => {
      void client.get('/favicon.ico').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/vnd.microsoft.icon');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      }).end((err) => err ? reject(err) : resolve());
    }));

    it('should hand over to the next controller if no asset with that name is found', () => new Promise<void>((resolve, reject) => {
      void client.get('/assets/unknown').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      }).end((err) => err ? reject(err) : resolve());
    }));

    it('should hand over to the next controller for non-asset paths', () => new Promise<void>((resolve, reject) => {
      void client.get('/other').expect(() => {
        expect(controller.next.calledOnce).toBe(true);
      }).end((err) => err ? reject(err) : resolve());
    }));
  });
});
