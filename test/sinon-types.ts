/* Minimal typing for the sinon 1.x API surface this codebase relies on.
   No @types/sinon is installed, since the latest @types/sinon targets the
   modern (5.x+) API and would misdescribe this old, pinned version. */

export interface SinonSpyCall {
  args: any[];
  returnValue: any;
}

export interface SinonSpyLike {
  (...args: any[]): any;
  called: boolean;
  calledOnce: boolean;
  calledTwice: boolean;
  callCount: number;
  args: any[][];
  firstCall: SinonSpyCall;
  calledWith(...args: any[]): boolean;
  calledWithExactly(...args: any[]): boolean;
  getCall(n: number): SinonSpyCall;
  reset(): void;
  restore(): void;
}

export interface SinonStubLike extends SinonSpyLike {
  returns(value: any): SinonStubLike;
  withArgs(...args: any[]): SinonStubLike;
  throws(error?: Error | string): SinonStubLike;
}

export interface SinonSandboxLike {
  stub(): SinonStubLike;
  stub(obj: any, method: string, fn?: (...args: any[]) => any): SinonStubLike;
  spy(fn?: (...args: any[]) => any): SinonSpyLike;
  spy(obj: any, method: string): SinonSpyLike;
  restore(): void;
}

export interface SinonLike {
  spy(fn?: (...args: any[]) => any): SinonSpyLike;
  spy(obj: any, method: string): SinonSpyLike;
  stub(): SinonStubLike;
  stub(obj: any, method: string, fn?: (...args: any[]) => any): SinonStubLike;
  match(value: any): any;
  sandbox: { create(): SinonSandboxLike };
}
