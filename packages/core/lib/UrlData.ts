/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A data object class for preset URL information */

interface IUrlDataOptions {
  baseURL?: string;
  assetsPath?: string;
  protocol?: string;
}

// Creates a new UrlData
class UrlData {
  public baseURL: string;
  public baseURLRoot: string;
  public baseURLPath: string;
  public blankNodePath: string;
  public blankNodePrefix: string;
  public blankNodePrefixLength: number;
  public assetsPath: string;
  public protocol: string;

  constructor(options?: IUrlDataOptions) {
    // Configure preset URLs
    options = options || {};
    this.baseURL = (options.baseURL || '/').replace(/\/?$/, '/');
    this.baseURLRoot = this.baseURL.match(/^(?:https?:\/\/[^\/]+)?/)![0];
    this.baseURLPath = this.baseURL.substr(this.baseURLRoot.length);
    this.blankNodePath = this.baseURLRoot ? '/.well-known/genid/' : '';
    this.blankNodePrefix = this.blankNodePath ? this.baseURLRoot + this.blankNodePath : 'genid:';
    this.blankNodePrefixLength = this.blankNodePrefix.length;
    this.assetsPath = (this.baseURLPath + 'assets/' || options.assetsPath) as string;
    this.protocol = options.protocol || '';
    if (!this.protocol) {
      let protocolMatch = (this.baseURL || '').match(/^(\w+):/);
      this.protocol = protocolMatch ? protocolMatch[1] : 'http';
    }
  }
}

export = UrlData;
