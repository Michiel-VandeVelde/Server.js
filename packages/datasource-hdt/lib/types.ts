/*! @license MIT ©2014-2026 Ruben Verborgh and contributors, Ghent University - imec */
/* Shared type definitions for @ldf/datasource-hdt. */

import type { DatasourceOptions } from '@ldf/core/lib/types';

// HdtDatasource/ExternalHdtDatasource extend core's Datasource directly (not MemoryDatasource),
// so `file` is their own field, not inherited.
export interface HdtDatasourceOptions extends DatasourceOptions {
  file?: string;
  // Switches to ExternalHdtDatasource (out-of-process querying) instead of in-process HDT.
  external?: boolean;
}

export interface ExternalHdtDatasourceOptions extends DatasourceOptions {
  file?: string;
  // Whether to verify the HDT file and `hdt` CLI utility exist before querying.
  // Not declared in components.jsonld, but read directly by the constructor. Defaults to true.
  checkFile?: boolean;
}
