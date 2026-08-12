/*! @license MIT ©2013-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runCli, runCustom } from '@ldf/core/lib/CliRunner';
import { ComponentsManager } from 'componentsjs';
import { EventEmitter } from 'events';
import { sinon } from '../../../test/sinon';
import type { SinonSpyLike, SinonStubLike } from '../../../test/sinon-types';
import type { Cluster, Worker } from 'cluster';

// @types/node marks isMaster/workers readonly, but these tests need to stub
// them; the underlying property is writable/configurable at runtime.
type MutableCluster = Omit<Cluster, 'isMaster' | 'workers'> & { isMaster: boolean; workers: Cluster['workers'] };

// A plain require (matching how CliRunner.ts itself accesses the module) rather
// than `import * as cluster`, whose synthetic ESM namespace object is frozen and
// can't have its properties stubbed/reassigned the way these tests need to.
const cluster = require('cluster') as MutableCluster;

function fakeWritable(): { write: SinonSpyLike } {
  return { write: sinon.spy() };
}

describe('CliRunner', () => {
  let sandbox: ReturnType<(typeof sinon)['sandbox']['create']>;
  let originalIsMaster: boolean, originalWorkers: typeof cluster.workers;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    originalIsMaster = cluster.isMaster;
    originalWorkers = cluster.workers;
  });
  afterEach(() => {
    sandbox.restore();
    cluster.isMaster = originalIsMaster;
    cluster.workers = originalWorkers;
  });

  describe('runCustom', () => {
    describe('with an invalid number of arguments', () => {
      it('should print usage and exit for zero arguments', () => {
        let exit = sandbox.stub(process, 'exit');
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom([], process.stdin, stdout, stderr, null, {});
        expect(stdout.write.calledWith(sinon.match('usage:'))).toBe(true);
        expect(exit.calledWith(1)).toBe(true);
      });

      it('should print usage and exit for more than 4 arguments', () => {
        let exit = sandbox.stub(process, 'exit');
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['a', 'b', 'c', 'd', 'e'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write.calledWith(sinon.match('usage:'))).toBe(true);
        expect(exit.calledWith(1)).toBe(true);
      });

      it('should print usage and exit for --help', () => {
        let exit = sandbox.stub(process, 'exit');
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['--help'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write.calledWith(sinon.match('usage:'))).toBe(true);
        expect(exit.calledWith(1)).toBe(true);
      });

      it('should print usage and exit for -h', () => {
        let exit = sandbox.stub(process, 'exit');
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['-h'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write.calledWith(sinon.match('usage:'))).toBe(true);
        expect(exit.calledWith(1)).toBe(true);
      });
    });

    describe('when the component definition fails to build', () => {
      it('should report the error and exit', () => new Promise<void>((done) => {
        let exit = sandbox.stub(process, 'exit');
        let error = new Error('bad config');
        sandbox.stub(ComponentsManager, 'build').returns(Promise.reject(error));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          expect(stderr.write.calledWith('Component definition error:\n')).toBe(true);
          expect(stderr.write.calledWith(sinon.match(error.stack))).toBe(true);
          expect(exit.calledWith(1)).toBe(true);
          done();
        });
      }));
    });

    describe('when instantiation fails', () => {
      it('should report the error and exit', () => new Promise<void>((done) => {
        let exit = sandbox.stub(process, 'exit');
        let error = new Error('bad instantiation');
        let manager = { instantiate: () => Promise.reject(error) };
        sandbox.stub(ComponentsManager, 'build').returns(Promise.resolve(manager));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(stderr.write.calledWith('Instantiation error:\n')).toBe(true);
            expect(stderr.write.calledWith(sinon.match(error.stack))).toBe(true);
            expect(exit.calledWith(1)).toBe(true);
            done();
          });
        });
      }));
    });

    describe('when running as a cluster worker', () => {
      it('should run the worker with the given port', () => new Promise<void>((done) => {
        cluster.isMaster = false;
        let worker = { run: sinon.spy(), _config: {} };
        let manager = { instantiate: () => Promise.resolve(worker) };
        sandbox.stub(ComponentsManager, 'build').returns(Promise.resolve(manager));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json', '3000'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(worker.run.calledWith(3000)).toBe(true);
            done();
          });
        });
      }));
    });

    describe('when running as the cluster master', () => {
      let fork: SinonStubLike, on: SinonStubLike, once: SinonStubLike;
      beforeEach(() => {
        fork = sandbox.stub(cluster, 'fork', () => Object.assign(new EventEmitter(), { process: { pid: fork.callCount + 8000 }, kill: sinon.spy() }));
        on = sandbox.stub(cluster, 'on');
        once = sandbox.stub(process, 'once');
        // Stubbed only to prevent real signal-listener registration during these tests.
        sandbox.stub(process, 'addListener');
        sandbox.stub(process, 'removeListener');
      });

      function build(config: Record<string, any>, extraProps?: Record<string, any>) {
        let worker = Object.assign({ run: sinon.spy(), _config: config }, extraProps);
        let manager = { instantiate: () => Promise.resolve(worker) };
        sandbox.stub(ComponentsManager, 'build', (options: { configLoader: (registry: { register: SinonSpyLike }) => void }) => {
          options.configLoader({ register: sinon.spy() });
          return Promise.resolve(manager);
        });
        return worker;
      }

      it('should fork one worker by default and announce the master', () => new Promise<void>((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(stdout.write.calledWith(sinon.match('Master ' + process.pid + ' running.'))).toBe(true);
            expect(fork.callCount).toBe(1);
            done();
          });
        });
      }));

      it('should fork as many workers as configured', () => new Promise<void>((done) => {
        build({ workers: 3 });
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(fork.callCount).toBe(3);
            done();
          });
        });
      }));

      it('should register a listening handler that respawns a worker that crashed unexpectedly', () => new Promise<void>((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(on.calledWith('listening')).toBe(true);
            let listeningHandler = on.args.find((args) => args[0] === 'listening')![1];
            let crashedWorker = Object.assign(new EventEmitter(), { process: { pid: 999 }, exitedAfterDisconnect: false });
            listeningHandler(crashedWorker);
            crashedWorker.emit('exit', 1, null);
            expect(stdout.write.calledWith(sinon.match('died with 1'))).toBe(true);
            expect(fork.callCount).toBe(2);
            done();
          });
        });
      }));

      it('should not respawn a worker that disconnected intentionally', () => new Promise<void>((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let listeningHandler = on.args.find((args) => args[0] === 'listening')![1];
            let disconnectedWorker = Object.assign(new EventEmitter(), { process: { pid: 999 }, exitedAfterDisconnect: true });
            listeningHandler(disconnectedWorker);
            disconnectedWorker.emit('exit', 0, null);
            expect(fork.callCount).toBe(1);
            done();
          });
        });
      }));

      it('should disconnect the cluster on SIGINT', () => new Promise<void>((done) => {
        let disconnect = sandbox.stub(cluster, 'disconnect');
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(once.calledWith('SIGINT')).toBe(true);
            let sigintHandler = once.args.find((args) => args[0] === 'SIGINT')![1];
            sigintHandler();
            expect(disconnect.calledOnce).toBe(true);
            done();
          });
        });
      }));

      it('should immediately report completion on SIGHUP when there are no workers left', () => new Promise<void>((done) => {
        cluster.workers = {};
        let onSighup = sandbox.stub(process, 'on');
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(onSighup.calledWith('SIGHUP')).toBe(true);
            let sighupHandler = onSighup.args.find((args) => args[0] === 'SIGHUP')![1];
            sighupHandler();
            expect(stdout.write.calledWith(sinon.match('Respawning workers of master'))).toBe(true);
            expect(stdout.write.calledWith(sinon.match('Respawned all workers of master'))).toBe(true);
            done();
          });
        });
      }));

      it('should respawn an old worker once its replacement starts listening', () => new Promise<void>((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: sinon.spy() });
        cluster.workers = { 1: oldWorker as unknown as Worker };
        let onSighup = sandbox.stub(process, 'on');
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.args.find((args) => args[0] === 'SIGHUP')![1];
            sighupHandler();
            // The respawn loop just forked a replacement worker; grab it and
            // make it start listening, which should trigger killing the old one.
            let newWorker = fork.getCall(fork.callCount - 1).returnValue;
            newWorker.emit('listening');
            expect(oldWorker.kill.calledOnce).toBe(true);
            oldWorker.emit('exit');
            expect(stdout.write.calledWith(sinon.match('replaces killed worker'))).toBe(true);
            expect(stdout.write.calledWith(sinon.match('Respawned all workers of master'))).toBe(true);
            done();
          });
        });
      }));
    });
  });

  describe('runCli', () => {
    it('should invoke runCustom with argv, standard streams, and the module root path', () => {
      let exit = sandbox.stub(process, 'exit');
      let write = sandbox.stub(process.stdout, 'write');
      let originalArgv = process.argv;
      process.argv = ['node', 'script.js'];
      try {
        runCli('/path/to/module');
        expect(write.calledWith(sinon.match('usage:'))).toBe(true);
        expect(exit.calledWith(1)).toBe(true);
      }
      finally {
        write.restore();
        process.argv = originalArgv;
      }
    });
  });
});
