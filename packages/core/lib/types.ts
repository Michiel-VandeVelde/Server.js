/*! @license MIT ©2014-2026 Ruben Verborgh and contributors, Ghent University - imec */
/* Shared type definitions used across @ldf/core's base classes. */

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import type { UrlObject } from 'url';
import type { ParsedUrlQuery } from 'querystring';
import type {
  DataFactoryInterface,
  Quad_Graph as QuadGraph,
  Quad_Object as QuadObject,
  Quad_Predicate as QuadPredicate,
  Quad_Subject as QuadSubject,
} from 'n3';
import type { EventEmitter } from 'events';
import type UrlData = require('./UrlData');
import type Datasource = require('./datasources/Datasource');
import type Controller = require('./controllers/Controller');
import type View = require('./views/View');
import type ViewCollection = require('./views/ViewCollection');

// An error-first "done" callback, as used throughout View/HtmlView/RdfView rendering.
// `null` is included because some writers (e.g. the JSON-LD serializer) explicitly call `done(null)`.
export type RenderDone = (error?: Error | null) => void;

// A query against a Datasource's quads, built up by routers and consumed by Datasource#select/#supportsQuery.
export interface Query {
  subject?: QuadSubject;
  predicate?: QuadPredicate;
  object?: QuadObject;
  graph?: QuadGraph;
  datasource?: string;
  features?: Record<string, boolean>;
  limit?: number;
  offset?: number;
}

// The subset of the `request` package's call signature Datasource#_fetch and datasource-sparql
// actually use (an options object, an optional error-first callback, an EventEmitter-like stream
// out) — not the full `request` module with its static helpers (.get, .post, .jar, .defaults, ...),
// which no caller here needs.
export type RequestFunction = (
  options: { url: string; headers?: Record<string, string>; timeout?: number },
  callback?: (error: any, response?: any, body?: any) => void,
) => EventEmitter;

// The parsed URL Controller attaches to incoming requests (see Controller#handleRequest),
// reusing Node's own UrlObject shape rather than hand-rolling one.
export type ParsedRequestUrl = UrlObject;

// A plain Node HTTP request/response, augmented with the ad-hoc fields Controller/LinkedDataFragmentsServer
// attach at runtime (there's no express/connect layer in this codebase — see LinkedDataFragmentsServer).
export type LdfRequest = IncomingMessage & { parsedUrl?: ParsedRequestUrl };
export type LdfResponse = ServerResponse & { error?: Error };

// The minimal { url, headers } shape controllers build before calling router#extractQueryParams —
// not a real HTTP request. `url.query` is always the parsed-object form here (routers are only ever
// called with an already-parsed URL), narrower than the general ParsedRequestUrl.
export interface RouterRequest {
  url?: { pathname?: string | null; query?: ParsedUrlQuery };
  headers?: IncomingHttpHeaders;
}

export interface DatasourceOptions {
  urlData?: UrlData;
  path?: string;
  skolemizeBlacklist?: Record<string, boolean>;
  title?: string;
  id?: string;
  hide?: boolean;
  enabled?: boolean;
  description?: string;
  license?: string;
  licenseUrl?: string;
  copyright?: string;
  homepage?: string;
  request?: RequestFunction;
  dataFactory?: DataFactoryInterface;
  graph?: string;
  quads?: boolean;
}

export interface MemoryDatasourceOptions extends DatasourceOptions {
  file?: string;
  url?: string;
}

export interface IndexDatasourceOptions extends MemoryDatasourceOptions {
  datasources?: Record<string, Datasource>;
}

export interface ControllerOptions {
  prefixes?: Record<string, string>;
  datasources?: Record<string, Datasource>;
  views?: ViewCollection | View[];
  urlData?: UrlData;
}

export interface AssetsControllerOptions extends ControllerOptions {
  assetsFolders?: string[];
}

export interface DereferenceControllerOptions extends ControllerOptions {
  dereference?: Record<string, { path: string }>;
}

export interface LinkedDataFragmentsServerOptions {
  urlData?: UrlData;
  ssl?: {
    rejectUnauthorized?: boolean;
    requestCert?: boolean;
    keys?: Record<string, string | string[]>;
    [key: string]: unknown;
  };
  authentication?: { webid?: boolean };
  log?: (...args: unknown[]) => void;
  accesslogger?: (request: LdfRequest, response: LdfResponse) => void;
  controllers?: Controller[];
  response?: { headers?: Record<string, string> };
}

// The fully-resolved config a worker receives (from ComponentsJS instantiation) to start a server.
export interface WorkerConfig extends LinkedDataFragmentsServerOptions {
  datasources: Record<string, Datasource>;
  routers?: unknown[];
  logging?: { enabled?: boolean; file?: string };
  port?: number;
}

// Settings/defaults passed into View and its subclasses. Kept open-ended: every consuming
// package's views attach their own render-time fields (e.g. timegates, summaries).
export interface ViewSettings {
  dataFactory?: DataFactoryInterface;
  views?: ViewCollection | View[];
  urlData?: UrlData;
  [key: string]: unknown;
}

// The `metadata` property Datasource#_executeQuery implementations set on their destination
// stream (see BufferedIterator#setProperty('metadata', ...)), read back via #getProperty.
export interface DatasourceMetadata {
  totalCount: number;
  hasExactCount: boolean;
}

// A single content type a view supports (see View#_parseContentTypes).
export interface ContentTypeMatch {
  type: string;
  responseType: string;
  quality: number;
}

// The result of content-negotiating a view for a request (see ViewCollection#matchView).
export interface ViewMatch extends ContentTypeMatch {
  view: View;
}
