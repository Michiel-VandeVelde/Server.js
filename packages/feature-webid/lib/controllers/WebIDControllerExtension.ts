/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

import * as http from 'http';
import lru = require('lru-cache');
import parseCacheControl = require('parse-cache-control');
import * as N3 from 'n3';
import LdfCore = require('@ldf/core');
import type { ControllerOptions, LdfRequest, LdfResponse } from '@ldf/core/lib/types';

const n3parser = N3.Parser;
const Util = LdfCore.Util;
const Controller = LdfCore.controllers.Controller;

let CERT_NS = 'http://www.w3.org/ns/auth/cert#';

interface WebIdCacheEntry {
  modulus?: string;
  exponent?: number;
}

// NOTE (pre-existing bug, preserved as-is): this shape doesn't match Node's real
// tls.PeerCertificate (which has a top-level, lowercase `subjectaltname`, not a nested
// `subject.subjectAltName`) — WebID cert verification likely never reads the SAN correctly.
// Typed to match what the code actually reads, not the real certificate shape.
interface WebIdCertificate {
  subject?: { subjectAltName?: string };
  modulus: string;
  exponent: string;
}

interface VerifyCallback {
  (error: string | null, verified?: boolean, reason?: string): void;
}

// Creates a new WebIDControllerExtensionsl
class WebIDControllerExtension extends Controller {
  protected _cache: lru<string, WebIdCacheEntry>;
  protected _protocol?: string;

  constructor(settings: ControllerOptions) {
    super(settings);
    // NOTE (pre-existing bug, preserved as-is): the installed lru-cache (v6) is a real ES6
    // class; calling it without `new` throws a TypeError on every instantiation of this
    // controller extension — the whole WebID feature is broken from construction time.
    this._cache = (lru as unknown as (max: number) => lru<string, WebIdCacheEntry>)(50);
    this._protocol = settings.urlData!.protocol;
  }

  // Add WebID Link headers
  override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: unknown) {
    // Get WebID from certificate
    if (this._protocol !== 'https') // This WebID implementation requires HTTPS
      return next();

    let self = this,
        // `request.connection` is Node's deprecated alias for `.socket`; only a TLS socket
        // exposes `getPeerCertificate()`, matching the `_protocol !== 'https'` guard above.
        certificate = (request.connection as unknown as { getPeerCertificate(): WebIdCertificate }).getPeerCertificate();

    if (!(certificate.subject && certificate.subject.subjectAltName)) {
      return this._handleForbidden(request, response, {
        reason: 'No WebID found in client certificate.',
      });
    }

    let webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');
    this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent, 16),
      (error, verified, reason) => {
        if (!verified) {
          return self._handleForbidden(request, response, {
            webID: webID,
            reason: reason,
          });
        }
        next();
      });
  }

  // Verify webID
  _verifyWebID(webID: string, modulus: string, exponent: number, callback: VerifyCallback) {
    // request & parse
    // NOTE (pre-existing bug, preserved as-is): N3.Parser is invoked here as a plain function,
    // not with `new` — since it's a real ES6 class at runtime, this throws a TypeError on every
    // call. In practice this path is rarely reached because the subjectAltName check above
    // almost always fails first (see the WebIdCertificate note), which likely masked this bug.
    let parser = (n3parser as unknown as () => N3.Parser)(),
        id: WebIdCacheEntry = {};

    // parse webID
    function parseTriple(error: Error, triple: N3.Quad, prefixes: unknown) {
      if (error)
        callback('Cannot parse WebID: ' + error);
      else if (triple) {
        // NOTE (pre-existing bug, preserved as-is): `triple.predicate` is a Term object, never
        // strictly equal to the string cases below — this switch never matches, so
        // id.modulus/id.exponent are never actually populated from the parsed WebID document.
        switch (triple.predicate as unknown as string) {
        case CERT_NS + 'modulus':
          // Add modulus
          const literalValue = (triple.object as N3.Literal).value;
          // Apply parsing method by nodejs
          id.modulus = literalValue.slice(literalValue.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();
          break;
        case CERT_NS + 'exponent':
          // Add exponent
          id.exponent = parseInt((triple.object as N3.Literal).value, 10);
          break;
        }
      }
    }

    function verify(m?: string, e?: number) {
      if (m && m === modulus && e && e === exponent)
        callback(null, true);
      else
        callback(null, false, 'WebID does not match certificate: ' + m + ' - ' + e + ' (webid) <> ' + modulus + ' - ' + exponent + ' (cert)');
    }

    // Try to get WebID from cache
    let cachedId = this._cache.get(webID);

    if (cachedId)
      verify(cachedId.modulus, cachedId.exponent);
    else {
      let req = http.request(webID, (res) => {
        res.setEncoding('utf8');

        parser.parse(res, parseTriple);

        res.on('end', () => {
          // NOTE (pre-existing bug, preserved as-is): Node lowercases response header names, so
          // `res.headers['Cache-Control']` (capitalized) never matches; this always parses ''.
          let cacheControl = parseCacheControl((res.headers['Cache-Control'] as string) || '');
          this._cache.set(webID, id, (cacheControl && cacheControl['max-age']) || 0);
          verify(id.modulus, id.exponent);
        });
      });

      req.on('error', (e: Error) => {
        callback(null, false, 'Unabled to download ' + webID + ' (' + e.message + ').');
      });

      req.end();
    }
  }

  _handleForbidden(request: LdfRequest, response: LdfResponse, options: { webID?: string; reason?: string }) {
    // Render the 404 message using the appropriate view
    let view = this._negotiateView('Forbidden', request, response),
        metadata = {
          url: request.url,
          prefixes: this._prefixes,
          datasources: this._datasources,
          reason: options.reason,
        };
    response.writeHead(401);
    view.render(metadata, request, response);
  }

  // NOTE (pre-existing bug, preserved as-is): this overrides core Controller's
  // `_handleNotAcceptable(request, response, next)` with an incompatible 3rd parameter
  // (an `{webID, reason}` options object instead of a `next` callback) — and is never invoked
  // by name in this file (only `_handleForbidden` is called above). If the base class's own
  // content-negotiation-failure path ever called this normally, `options` would actually be a
  // `next` function, and `options.webID`/`options.reason` would just read `undefined`.
  override _handleNotAcceptable(request: LdfRequest, response: LdfResponse, options: any) {
    response.writeHead(401, {
      'Content-Type': Util.MIME_PLAINTEXT,
    });
    response.end('Access to ' + request.url + ' is not allowed, verification for WebID ' + (options.webID || '') + ' failed. Reason: ' + (options.reason || ''));
  }
}

export = WebIDControllerExtension;
