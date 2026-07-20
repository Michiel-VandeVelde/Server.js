/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* An TimegateController responds to timegate requests */

import LdfCore = require('@ldf/core');
import _ = require('lodash');
import url = require('url');

const Controller = LdfCore.controllers.Controller;
const Util = LdfCore.Util;

// Creates a new TimegateController
class TimegateController extends Controller {
  [key: string]: any;

  constructor(options?: any) {
    options = options || {};
    super(options);
    this._first = true;

    // Settings for timegate
    let timegates = options.timegates || {};
    this._timemaps = (TimegateController as any).parseTimegateMap(timegates.mementos);

    // Set up path matching
    this._timegatePath = timegates.baseUrl || '/timegate/',
    this._matcher = new RegExp('^' + Util.toRegExp(this._timegatePath) + '(.+?)\/?(?:\\?.*)?$');
  }

  static parseTimegateMap(mementos: any) {
    return _.mapValues(mementos, (mementos: any) => {
      return sortTimemap(mementos.map((memento: any) => {
        return {
          datasource: memento.datasource,
          datasourceId: memento.datasource.id,
          interval: [memento.initial, memento.final].map(toDate),
          original: memento.originalBaseURL,
        };
      }));
    });
  }

  static parseInvertedTimegateMap(mementos: any, urlData: any) {
    let timemaps = (TimegateController as any).parseTimegateMap(mementos);
    let invertedTimegateMap: any = {};
    _.forIn(timemaps, (versions: any, timeGateId: any) => {
      versions.forEach((version: any) => {
        invertedTimegateMap[version.datasourceId] = {
          memento: timeGateId,
          original: version.original || (urlData.baseURL || '/') + timeGateId,
          interval: version.interval,
        };
      });
    });
    return invertedTimegateMap;
  }

  // Perform time negotiation if applicable
  override _handleRequest(request: any, response: any, next: any) {
    let timegateMatch = this._matcher.exec(request.url),
        datasource = timegateMatch && timegateMatch[1],
        timemapDetails = datasource && this._timemaps[datasource];

    // Is this resource a well-configured timegate?
    if (timemapDetails) {
      // For OPTIONS (preflight) requests, send only headers (avoiding expensive lookups)
      if (request.method === 'OPTIONS')
        return response.end();

      // Try to find the memento closest to the requested date
      let acceptDatetime = toDate(request.headers['accept-datetime']),
          memento = this._getClosestMemento(timemapDetails, acceptDatetime);

      if (memento) {
        // Determine the URL of the memento
        let mementoUrl = _.assign(request.parsedUrl, { pathname: memento.datasource.path });
        mementoUrl = url.format(mementoUrl);

        // Determine the URL of the original resource
        let originalBaseURL = timemapDetails.original, originalUrl;
        if (!originalBaseURL)
          originalUrl = { ...request.parsedUrl, pathname: datasource };
        else
          originalUrl = _.assign(url.parse(originalBaseURL), { query: request.parsedUrl.query });
        originalUrl = url.format(originalUrl);

        // Perform 200-style negotiation (https://tools.ietf.org/html/rfc7089#section-4.1.2)
        response.setHeader('Link', '<' + originalUrl + '>;rel="original",' +
          '<' + mementoUrl  + '>;rel="memento";' +
          'datetime="' + memento.interval[0].toUTCString() + '"');
        response.setHeader('Vary', 'Accept-Datetime');
        response.setHeader('Content-Location', mementoUrl);
        // Set request URL to the memento URL, which should be handled by a next controller
        request.url = mementoUrl.replace(/^[^:]+:\/\/[^\/]+/, '');
        delete request.parsedUrl;
      }
    }
    next();
  }

  /*
    * @param timemap: [{"datasource": "data source name", "interval": [start, end]}, ...]
                    the start, end values can either be Date objects, or ISO 8601 string.
    * @param accept_datetime: the requested datetime value as Date object, or ISO 8601 string.
    * @param sorted: bool. If not sorted, the timemap will be sorted using the start time in the interval.

    * eg:
      const timemap = [
        {"datasource": "dbpedia_2012", "interval": ["2011-10-20T12:22:24Z", new Date("2012-10-19T12:22:24Z")]},
        {"datasource": "dbpedia_2015", "interval": ["2014-10-20T12:22:24Z", ""]},
        {"datasource": "dbpedia_2013", "interval": [new Date("2012-10-20T12:22:24Z"), new Date("2013-10-19T12:22:24Z")]},
        {"datasource": "dbpedia_2014", "interval": ["2013-10-20T12:22:24Z", "2014-10-19T12:22:24Z"]}
      ];
      get_closest_memento(timemap, "2011-10-20T12:22:24Z", false);
  */
  _getClosestMemento(timemap: any, acceptDatetime: any, unsorted?: any) {
    // NOTE: assuming that the interval is always specified as [start_date, end_date]
    // empty timemap can't give any mementos
    if (timemap.length === 0)
      return null;

    // convert accept datetime to timestamp
    acceptDatetime = toDate(acceptDatetime).getTime();

    // If accept datetime is invalid, exit
    if (isNaN(acceptDatetime)) return null;
    // Sort timemap first if it is not sorted
    if (unsorted) sortTimemap(timemap);

    // if the accept_datetime is less than the first memento, return first memento
    let firstMemento = timemap[0],
        firstMementoDatetime = toDate(firstMemento.interval[0]).getTime();
    if (acceptDatetime <= firstMementoDatetime) return firstMemento;

    // return the latest memento if the accept datetime is after it
    let lastMemento = timemap[timemap.length - 1],
        lastMementoDatetime = toDate(lastMemento.interval[1]).getTime();
    if (acceptDatetime >= lastMementoDatetime) return lastMemento;

    // check if the accept datetime falls within any intervals defined in the data sources.
    for (let i = 0, memento; memento = timemap[i]; i++) {
      let startTime = memento.interval[0].getTime(),
          endTime   = memento.interval[1].getTime();
      if (isFinite(startTime) && isFinite(endTime)) {
        if (startTime > acceptDatetime) return timemap[i - 1];
        if (startTime <= acceptDatetime && endTime >= acceptDatetime) return memento;
      }
    }
    return null;
  }
}


// Sort the timemap by interval start date
function sortTimemap(timemap: any) {
  return timemap.sort((a: any, b: any) => {
    return a.interval[0].getTime() - b.interval[0].getTime();
  });
}

// Convert the value to a date
function toDate(value: any) {
  return typeof value === 'string' ? new Date(value) : (value || new Date());
}

export = TimegateController;
