/*! @license MIT ©2016-2026 Miel Vander Sande and contributors, Ghent University - imec */
/* Shared type definitions for @ldf/feature-memento. */

import type Datasource = require('@ldf/core/lib/datasources/Datasource');
import type { ControllerOptions, Query } from '@ldf/core/lib/types';

export interface MementoVersion {
  datasource: Datasource;
  initial: string | Date;
  final: string | Date;
  originalBaseURL?: string;
}

// The raw `timegates` config settings, as configured per-datasource.
// NOTE (pre-existing inconsistency, preserved as-is): MementoControllerExtension reads
// `baseURL`, TimegateController reads `baseUrl` — different casing for what looks like
// the same concept; both are kept here rather than unified.
export interface TimegateSettings {
  mementos?: Record<string, MementoVersion[]>;
  baseURL?: string;
  baseUrl?: string;
}

export interface ParsedMementoVersion {
  datasource: Datasource;
  datasourceId?: string;
  interval: Date[];
  original?: string;
}

export type TimegateMap = Record<string, ParsedMementoVersion[]>;

export interface InvertedTimegateEntry {
  memento: string;
  original: string;
  interval: Date[];
}

export type InvertedTimegateMap = Record<string, InvertedTimegateEntry>;

export interface MementoControllerExtensionOptions extends ControllerOptions {
  timegates?: TimegateSettings;
}

export interface TimegateControllerOptions extends ControllerOptions {
  timegates?: TimegateSettings;
}

// A datasource as referenced from a request's per-render settings, carrying the
// Memento-specific `timegate` field attached alongside the datasource's own config.
export type MementoAwareDatasource = Datasource & { timegate?: string | boolean };

export interface MementoRequestSettings {
  query: Query;
  datasource: MementoAwareDatasource;
}
