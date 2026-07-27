/*! @license MIT ©2015-2026 Ruben Verborgh, Ruben Taelman and contributors, Ghent University - imec */
/* Shared type definitions for @ldf/feature-qpf. */

import type { AsyncIterator } from 'asynciterator';
import type { Quad } from 'n3';
import type Datasource = require('@ldf/core/lib/datasources/Datasource');
import type Controller = require('@ldf/core/lib/controllers/Controller');
import type { ControllerOptions, Query, RouterRequest, ViewSettings } from '@ldf/core/lib/types';

// The shared shape of core's DatasourceRouter/PageRouter and this package's QuadPatternRouter.
export interface FragmentRouter {
  extractQueryParams(request: RouterRequest, query: Query): void;
}

export interface QuadPatternFragmentsControllerOptions extends ControllerOptions {
  routers?: FragmentRouter[];
  extensions?: Controller[];
}

export interface FragmentQuery extends Query {
  patternString?: string;
}

// A datasource as exposed through fragment metadata, augmented with fields computed
// by QuadPatternFragmentsController#_createFragmentMetadata.
export interface FragmentDatasource extends Datasource {
  index?: string;
  templateUrl?: string;
  supportsQuads?: boolean;
}

export interface FragmentInfo {
  url: string;
  pageUrl: string;
  firstPageUrl: string;
  nextPageUrl: string;
  previousPageUrl: string | null;
}

// The combined per-request settings object built by _createFragmentMetadata and threaded
// through view rendering. Kept open-ended (like core's ViewSettings) since HtmlView adds
// `quads`/`metadata`/`extensions` at render time, and extensions can attach their own fields.
export interface FragmentMetadata {
  datasource: FragmentDatasource;
  fragment: FragmentInfo;
  query: FragmentQuery;
  prefixes: Record<string, string>;
  datasources: Record<string, Datasource>;
  results?: AsyncIterator<Quad>;
  [key: string]: unknown;
}

export interface QpfViewSettings extends ViewSettings {
  viewNameOverride?: string;
}
