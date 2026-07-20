/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

import * as http from 'http';
import lru = require('lru-cache');
import parseCacheControl = require('parse-cache-control');
import * as N3 from 'n3';
import LdfCore = require('@ldf/core');

const n3parser: any = N3.Parser;
const Util = LdfCore.Util;
const Controller = LdfCore.controllers.Controller;

let CERT_NS = 'http://www.w3.org/ns/auth/cert#';

// Creates a new WebIDControllerExtensionsl
class WebIDControllerExtension extends Controller {
  [key: string]: any;

  constructor(settings: any) {
    super(settings);
    this._cache = (lru as any)(50);
    this._protocol = settings.urlData.protocol;
  }

  // Add WebID Link headers
  override _handleRequest(request: any, response: any, next: any, settings: any) {
    // Get WebID from certificate
    if (this._protocol !== 'https') // This WebID implementation requires HTTPS
      return next();

    let self = this,
        certificate = request.connection.getPeerCertificate();

    if (!(certificate.subject && certificate.subject.subjectAltName)) {
      return this._handleForbidden(request, response, {
        reason: 'No WebID found in client certificate.',
      });
    }

    let webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');
    this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent, 16),
      (error: any, verified: any, reason: any) => {
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
  _verifyWebID(webID: any, modulus: any, exponent: any, callback: any) {
    // request & parse
    let parser = n3parser(),
        id: any = {};

    // parse webID
    function parseTriple(error: any, triple: any, prefixes: any) {
      if (error)
        callback('Cannot parse WebID: ' + error);
      else if (triple) {
        switch (triple.predicate) {
        case CERT_NS + 'modulus':
          // Add modulus
          const literalValue = triple.object.value;
          // Apply parsing method by nodejs
          id.modulus = literalValue.slice(literalValue.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();
          break;
        case CERT_NS + 'exponent':
          // Add exponent
          id.exponent = parseInt(triple.object.value, 10);
          break;
        }
      }
    }

    function verify(m: any, e: any) {
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
      let req = http.request(webID as any, (res: any) => {
        res.setEncoding('utf8');

        parser.parse(res, parseTriple);

        res.on('end', () => {
          let cacheControl: any = parseCacheControl(res.headers['Cache-Control'] || '');
          this._cache.set(webID, id, cacheControl['max-age'] || 0);
          verify(id.modulus, id.exponent);
        });
      });

      req.on('error', (e: any) => {
        callback(null, false, 'Unabled to download ' + webID + ' (' + e.message + ').');
      });

      req.end();
    }
  }

  _handleForbidden(request: any, response: any, options: any) {
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

  override _handleNotAcceptable(request: any, response: any, options: any) {
    response.writeHead(401, {
      'Content-Type': Util.MIME_PLAINTEXT,
    });
    response.end('Access to ' + request.url + ' is not allowed, verification for WebID ' + (options.webID || '') + ' failed. Reason: ' + (options.reason || ''));
  }
}

export = WebIDControllerExtension;
