import { AsyncLocalStorage } from "node:async_hooks";
import { Readable, PassThrough } from "node:stream";
import "react";
import { RouterProvider } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import { defineHandlerCallback, renderRouterToStream } from "@tanstack/react-router/ssr/server";
function StartServer(props) {
  return /* @__PURE__ */ jsx(RouterProvider, { router: props.router });
}
var defaultStreamHandler = defineHandlerCallback(({ request, router, responseHeaders }) => renderRouterToStream({
  request,
  router,
  responseHeaders,
  children: /* @__PURE__ */ jsx(StartServer, { router })
}));
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  return e.prototype = /* @__PURE__ */ Object.create(null), Object.freeze(e.prototype), e;
})();
function lazyInherit(target, source, sourceKey) {
  for (const key of [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)]) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (!targetDesc?.value && typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const _needsNormRE = /(?:(?:^|\/)(?:\.|\.\.|%2e|%2e\.|\.%2e|%2e%2e)(?:\/|$))|[\\^#"<>{}`\x80-\uffff]/i;
const _searchNeedsNormRE = /[#"'<>]/;
const FastURL = /* @__PURE__ */ (() => {
  const NativeURL = globalThis.URL;
  const FastURL2 = class URL {
    #url;
    #href;
    #protocol;
    #host;
    #pathname;
    #search;
    #searchParams;
    #pos;
    constructor(url) {
      if (typeof url === "string") {
        const isOriginForm = url[0] === "/";
        if (isOriginForm && !_searchNeedsNormRE.test(url)) this.#href = url;
        else this.#url = new NativeURL(isOriginForm ? `http://localhost${url}` : url);
      } else if (_needsNormRE.test(url.pathname) || url.search && _searchNeedsNormRE.test(url.search)) this.#url = new NativeURL(`${url.protocol || "http:"}//${url.host || "localhost"}${url.pathname}${url.search || ""}`);
      else {
        this.#protocol = url.protocol;
        this.#host = url.host;
        this.#pathname = url.pathname;
        this.#search = url.search;
      }
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeURL;
    }
    get _url() {
      if (this.#url) return this.#url;
      this.#url = new NativeURL(this.href);
      this.#href = void 0;
      this.#protocol = void 0;
      this.#host = void 0;
      this.#pathname = void 0;
      this.#search = void 0;
      this.#searchParams = void 0;
      this.#pos = void 0;
      return this.#url;
    }
    get href() {
      if (this.#url) return this.#url.href;
      if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
      return this.#href;
    }
    #getPos() {
      if (!this.#pos) {
        const url = this.href;
        const protoIndex = url.indexOf("://");
        const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
        const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
        this.#pos = [
          protoIndex,
          pathnameIndex,
          qIndex
        ];
      }
      return this.#pos;
    }
    get pathname() {
      if (this.#url) return this.#url.pathname;
      if (this.#pathname === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.pathname;
        this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
      }
      return this.#pathname;
    }
    get search() {
      if (this.#url) return this.#url.search;
      if (this.#search === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.search;
        const url = this.href;
        this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
      }
      return this.#search;
    }
    get searchParams() {
      if (this.#url) return this.#url.searchParams;
      if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
      return this.#searchParams;
    }
    get protocol() {
      if (this.#url) return this.#url.protocol;
      if (this.#protocol === void 0) {
        const [protocolIndex] = this.#getPos();
        if (protocolIndex === -1) return this._url.protocol;
        const url = this.href;
        this.#protocol = url.slice(0, protocolIndex + 1);
      }
      return this.#protocol;
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
  lazyInherit(FastURL2.prototype, NativeURL.prototype, "_url");
  Object.setPrototypeOf(FastURL2.prototype, NativeURL.prototype);
  Object.setPrototypeOf(FastURL2, NativeURL);
  return FastURL2;
})();
const NodeResponse = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse2 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeResponse;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      let body = this.#body;
      if (body && typeof body.pipe === "function" && !(body instanceof Readable)) {
        const stream = new PassThrough();
        body.pipe(stream);
        const abort = body.abort;
        if (abort) stream.once("close", () => abort());
        body = stream;
      }
      this.#response = new NativeResponse(body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    _toNodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const headers = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        const lowerKey = typeof key === "string" ? key.toLowerCase() : String(key);
        if (Array.isArray(value)) for (const v2 of value) headers.push(lowerKey, v2);
        else headers.push(lowerKey, value);
        if (lowerKey === "content-type") hasContentTypeHeader = true;
        else if (lowerKey === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) headers.push("content-type", contentType);
      if (contentLength && !hasContentLength) headers.push("content-length", String(contentLength));
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers,
        body
      };
    }
  }
  lazyInherit(NodeResponse2.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse2, NativeResponse);
  Object.setPrototypeOf(NodeResponse2.prototype, NativeResponse.prototype);
  return NodeResponse2;
})();
function decodePathname(pathname) {
  return decodeURI(pathname.includes("%25") ? pathname.replace(/%25/g, "%2525") : pathname);
}
const kEventNS = "h3.internal.event.";
const kEventRes = /* @__PURE__ */ Symbol.for(`${kEventNS}res`);
const kEventResHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.headers`);
const kEventResErrHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.err.headers`);
var H3Event = class {
  app;
  req;
  url;
  context;
  static __is_event__ = true;
  constructor(req, context, app) {
    this.context = context || req.context || new NullProtoObj();
    this.req = req;
    this.app = app;
    const _url = req._url;
    const url = _url && _url instanceof URL ? _url : new FastURL(req.url);
    if (url.pathname.includes("%")) url.pathname = decodePathname(url.pathname);
    this.url = url;
  }
  get res() {
    return this[kEventRes] ||= new H3EventResponse();
  }
  get runtime() {
    return this.req.runtime;
  }
  waitUntil(promise) {
    this.req.waitUntil?.(promise);
  }
  toString() {
    return `[${this.req.method}] ${this.req.url}`;
  }
  toJSON() {
    return this.toString();
  }
  get node() {
    return this.req.runtime?.node;
  }
  get headers() {
    return this.req.headers;
  }
  get path() {
    return this.url.pathname + this.url.search;
  }
  get method() {
    return this.req.method;
  }
};
var H3EventResponse = class {
  status;
  statusText;
  get headers() {
    return this[kEventResHeaders] ||= new Headers();
  }
  get errHeaders() {
    return this[kEventResErrHeaders] ||= new Headers();
  }
};
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) return defaultStatusCode;
  if (typeof statusCode === "string") statusCode = +statusCode;
  if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
  return statusCode;
}
var HTTPError = class HTTPError2 extends Error {
  get name() {
    return "HTTPError";
  }
  status;
  statusText;
  headers;
  cause;
  data;
  body;
  unhandled;
  static isError(input) {
    return input instanceof Error && input?.name === "HTTPError";
  }
  static status(status, statusText, details) {
    return new HTTPError2({
      ...details,
      statusText,
      status
    });
  }
  constructor(arg1, arg2) {
    let messageInput;
    let details;
    if (typeof arg1 === "string") {
      messageInput = arg1;
      details = arg2;
    } else details = arg1;
    const status = sanitizeStatusCode(details?.status || details?.statusCode || details?.cause?.status || details?.cause?.statusCode, 500);
    const statusText = sanitizeStatusMessage(details?.statusText || details?.statusMessage || details?.cause?.statusText || details?.cause?.statusMessage);
    const message = messageInput || details?.message || details?.cause?.message || details?.statusText || details?.statusMessage || [
      "HTTPError",
      status,
      statusText
    ].filter(Boolean).join(" ");
    super(message, { cause: details });
    this.cause = details;
    this.status = status;
    this.statusText = statusText || void 0;
    const rawHeaders = details?.headers || details?.cause?.headers;
    this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
    this.unhandled = details?.unhandled ?? details?.cause?.unhandled ?? void 0;
    this.data = details?.data;
    this.body = details?.body;
  }
  get statusCode() {
    return this.status;
  }
  get statusMessage() {
    return this.statusText;
  }
  toJSON() {
    const unhandled = this.unhandled;
    return {
      status: this.status,
      statusText: this.statusText,
      unhandled,
      message: unhandled ? "HTTPError" : this.message,
      data: unhandled ? void 0 : this.data,
      ...unhandled ? void 0 : this.body
    };
  }
};
function isJSONSerializable(value, _type) {
  if (value === null || value === void 0) return true;
  if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
  if (typeof value.toJSON === "function") return true;
  if (Array.isArray(value)) return true;
  if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
  if (value instanceof NullProtoObj) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
  if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
  const response = prepareResponse(val, event, config);
  if (typeof response?.then === "function") return toResponse(response, event, config);
  const { onResponse } = config;
  return onResponse ? Promise.resolve(onResponse(response, event)).then(() => response) : response;
}
var HTTPResponse = class {
  #headers;
  #init;
  body;
  constructor(body, init) {
    this.body = body;
    this.#init = init;
  }
  get status() {
    return this.#init?.status || 200;
  }
  get statusText() {
    return this.#init?.statusText || "OK";
  }
  get headers() {
    return this.#headers ||= new Headers(this.#init?.headers);
  }
};
function prepareResponse(val, event, config, nested) {
  if (val === kHandled) return new NodeResponse(null);
  if (val === kNotFound) val = new HTTPError({
    status: 404,
    message: `Cannot find any route matching [${event.req.method}] ${event.url}`
  });
  if (val && val instanceof Error) {
    const isHTTPError = HTTPError.isError(val);
    const error = isHTTPError ? val : new HTTPError(val);
    if (!isHTTPError) {
      error.unhandled = true;
      if (val?.stack) error.stack = val.stack;
    }
    if (error.unhandled && !config.silent) console.error(error);
    const { onError } = config;
    const errHeaders = event[kEventRes]?.[kEventResErrHeaders];
    return onError && !nested ? Promise.resolve(onError(error, event)).catch((error2) => error2).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug, errHeaders);
  }
  const preparedRes = event[kEventRes];
  const preparedHeaders = preparedRes?.[kEventResHeaders];
  event[kEventRes] = void 0;
  if (!(val instanceof Response)) {
    const res = prepareResponseBody(val, event, config);
    const status = res.status || preparedRes?.status;
    return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
      status,
      statusText: res.statusText || preparedRes?.statusText,
      headers: res.headers && preparedHeaders ? mergeHeaders$1(res.headers, preparedHeaders) : res.headers || preparedHeaders
    });
  }
  if (!preparedHeaders || nested || !val.ok) return val;
  try {
    mergeHeaders$1(val.headers, preparedHeaders, val.headers);
    return val;
  } catch {
    return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
      status: val.status,
      statusText: val.statusText,
      headers: mergeHeaders$1(val.headers, preparedHeaders)
    });
  }
}
function mergeHeaders$1(base, overrides, target = new Headers(base)) {
  for (const [name, value] of overrides) if (name === "set-cookie") target.append(name, value);
  else target.set(name, value);
  return target;
}
const frozen = (name) => (...args) => {
  throw new Error(`Headers are frozen (${name} ${args.join(", ")})`);
};
var FrozenHeaders = class extends Headers {
  set = frozen("set");
  append = frozen("append");
  delete = frozen("delete");
};
const emptyHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
  if (val === null || val === void 0) return {
    body: "",
    headers: emptyHeaders
  };
  const valType = typeof val;
  if (valType === "string") return { body: val };
  if (val instanceof Uint8Array) {
    event.res.headers.set("content-length", val.byteLength.toString());
    return { body: val };
  }
  if (val instanceof HTTPResponse || val?.constructor?.name === "HTTPResponse") return val;
  if (isJSONSerializable(val, valType)) return {
    body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
    headers: jsonHeaders
  };
  if (valType === "bigint") return {
    body: val.toString(),
    headers: jsonHeaders
  };
  if (val instanceof Blob) {
    const headers = new Headers({
      "content-type": val.type,
      "content-length": val.size.toString()
    });
    let filename = val.name;
    if (filename) {
      filename = encodeURIComponent(filename);
      headers.set("content-disposition", `filename="${filename}"; filename*=UTF-8''${filename}`);
    }
    return {
      body: val.stream(),
      headers
    };
  }
  if (valType === "symbol") return { body: val.toString() };
  if (valType === "function") return { body: `${val.name}()` };
  return { body: val };
}
function nullBody(method, status) {
  return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug, errHeaders) {
  let headers = error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : new Headers(jsonHeaders);
  if (errHeaders) headers = mergeHeaders$1(headers, errHeaders);
  return new NodeResponse(JSON.stringify({
    ...error.toJSON(),
    stack: debug && error.stack ? error.stack.split("\n").map((l2) => l2.trim()) : void 0
  }, void 0, debug ? 2 : void 0), {
    status: error.status,
    statusText: error.statusText,
    headers
  });
}
var GLOBAL_EVENT_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:event-storage");
var globalObj$1 = globalThis;
if (!globalObj$1[GLOBAL_EVENT_STORAGE_KEY]) globalObj$1[GLOBAL_EVENT_STORAGE_KEY] = new AsyncLocalStorage();
var eventStorage = globalObj$1[GLOBAL_EVENT_STORAGE_KEY];
function isPromiseLike(value) {
  return typeof value.then === "function";
}
function getSetCookieValues(headers) {
  const headersWithSetCookie = headers;
  if (typeof headersWithSetCookie.getSetCookie === "function") return headersWithSetCookie.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}
function mergeEventResponseHeaders(response, event) {
  if (response.ok) return;
  const eventSetCookies = getSetCookieValues(event.res.headers);
  if (eventSetCookies.length === 0) return;
  const responseSetCookies = getSetCookieValues(response.headers);
  response.headers.delete("set-cookie");
  for (const cookie of responseSetCookies) response.headers.append("set-cookie", cookie);
  for (const cookie of eventSetCookies) response.headers.append("set-cookie", cookie);
}
function attachResponseHeaders(value, event) {
  if (isPromiseLike(value)) return value.then((resolved) => {
    if (resolved instanceof Response) mergeEventResponseHeaders(resolved, event);
    return resolved;
  });
  if (value instanceof Response) mergeEventResponseHeaders(value, event);
  return value;
}
function requestHandler(handler) {
  return (request, requestOpts) => {
    let h3Event;
    try {
      h3Event = new H3Event(request);
    } catch (error) {
      if (error instanceof URIError) return new Response(null, {
        status: 400,
        statusText: "Bad Request"
      });
      throw error;
    }
    return toResponse(attachResponseHeaders(eventStorage.run({ h3Event }, () => handler(request, requestOpts)), h3Event), h3Event);
  };
}
function getH3Event() {
  const event = eventStorage.getStore();
  if (!event) throw new Error(`No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return event.h3Event;
}
function getResponse() {
  return getH3Event().res;
}
var HEADERS = { TSS_SHELL: "X-TSS_SHELL" };
function sanitizePathSegment(segment) {
  return segment.replace(/[\x00-\x1f\x7f]/g, "");
}
function decodeSegment(segment) {
  let decoded;
  try {
    decoded = decodeURI(segment);
  } catch {
    decoded = segment.replaceAll(/%[0-9A-F]{2}/gi, (match) => {
      try {
        return decodeURI(match);
      } catch {
        return match;
      }
    });
  }
  return sanitizePathSegment(decoded);
}
function decodePath(path) {
  if (!path) return {
    path,
    handledProtocolRelativeURL: false
  };
  if (!/[%\\\x00-\x1f\x7f]/.test(path) && !path.startsWith("//")) return {
    path,
    handledProtocolRelativeURL: false
  };
  const re2 = /%25|%5C/gi;
  let cursor = 0;
  let result = "";
  let match;
  while (null !== (match = re2.exec(path))) {
    result += decodeSegment(path.slice(cursor, match.index)) + match[0];
    cursor = re2.lastIndex;
  }
  result = result + decodeSegment(cursor ? path.slice(cursor) : path);
  let handledProtocolRelativeURL = false;
  if (result.startsWith("//")) {
    handledProtocolRelativeURL = true;
    result = "/" + result.replace(/^\/+/, "");
  }
  return {
    path: result,
    handledProtocolRelativeURL
  };
}
function invariant() {
  throw new Error("Invariant failed");
}
function createLRUCache(max) {
  const cache = /* @__PURE__ */ new Map();
  let oldest;
  let newest;
  const touch = (entry) => {
    if (!entry.next) return;
    if (!entry.prev) {
      entry.next.prev = void 0;
      oldest = entry.next;
      entry.next = void 0;
      if (newest) {
        entry.prev = newest;
        newest.next = entry;
      }
    } else {
      entry.prev.next = entry.next;
      entry.next.prev = entry.prev;
      entry.next = void 0;
      if (newest) {
        newest.next = entry;
        entry.prev = newest;
      }
    }
    newest = entry;
  };
  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return void 0;
      touch(entry);
      return entry.value;
    },
    set(key, value) {
      if (cache.size >= max && oldest) {
        const toDelete = oldest;
        cache.delete(toDelete.key);
        if (toDelete.next) {
          oldest = toDelete.next;
          toDelete.next.prev = void 0;
        }
        if (toDelete === newest) newest = void 0;
      }
      const existing = cache.get(key);
      if (existing) {
        existing.value = value;
        touch(existing);
      } else {
        const entry = {
          key,
          value,
          prev: newest
        };
        if (newest) newest.next = entry;
        newest = entry;
        if (!oldest) oldest = entry;
        cache.set(key, entry);
      }
    },
    clear() {
      cache.clear();
      oldest = void 0;
      newest = void 0;
    }
  };
}
function isNotFound(obj) {
  return obj?.isNotFound === true;
}
var rootRouteId = "__root__";
function redirect(opts) {
  opts.statusCode = opts.statusCode || opts.code || 307;
  if (!opts._builtLocation && !opts.reloadDocument && typeof opts.href === "string") try {
    new URL(opts.href);
    opts.reloadDocument = true;
  } catch {
  }
  const headers = new Headers(opts.headers);
  if (opts.href && headers.get("Location") === null) headers.set("Location", opts.href);
  const response = new Response(null, {
    status: opts.statusCode,
    headers
  });
  response.options = opts;
  if (opts.throw) throw response;
  return response;
}
function isRedirect(obj) {
  return obj instanceof Response && !!obj.options;
}
function isResolvedRedirect(obj) {
  return isRedirect(obj) && !!obj.options.href;
}
function parseRedirect(obj) {
  if (obj !== null && typeof obj === "object" && obj.isSerializedRedirect) return redirect(obj);
}
function executeRewriteInput(rewrite, url) {
  const res = rewrite?.input?.({ url });
  if (res) {
    if (typeof res === "string") return new URL(res);
    else if (res instanceof URL) return res;
  }
  return url;
}
var stateIndexKey = "__TSR_index";
function createHistory(opts) {
  let location = opts.getLocation();
  const subscribers = /* @__PURE__ */ new Set();
  const notify = (action) => {
    location = opts.getLocation();
    subscribers.forEach((subscriber) => subscriber({
      location,
      action
    }));
  };
  const handleIndexChange = (action) => {
    if (opts.notifyOnIndexChange ?? true) notify(action);
    else location = opts.getLocation();
  };
  const tryNavigation = async ({ task, navigateOpts, ...actionInfo }) => {
    if (navigateOpts?.ignoreBlocker ?? false) {
      task();
      return;
    }
    const blockers = opts.getBlockers?.() ?? [];
    const isPushOrReplace = actionInfo.type === "PUSH" || actionInfo.type === "REPLACE";
    if (typeof document !== "undefined" && blockers.length && isPushOrReplace) for (const blocker of blockers) {
      const nextLocation = parseHref(actionInfo.path, actionInfo.state);
      if (await blocker.blockerFn({
        currentLocation: location,
        nextLocation,
        action: actionInfo.type
      })) {
        opts.onBlocked?.();
        return;
      }
    }
    task();
  };
  return {
    get location() {
      return location;
    },
    get length() {
      return opts.getLength();
    },
    subscribers,
    subscribe: (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    push: (path, state, navigateOpts) => {
      const currentIndex = location.state[stateIndexKey];
      state = assignKeyAndIndex(currentIndex + 1, state);
      tryNavigation({
        task: () => {
          opts.pushState(path, state);
          notify({ type: "PUSH" });
        },
        navigateOpts,
        type: "PUSH",
        path,
        state
      });
    },
    replace: (path, state, navigateOpts) => {
      const currentIndex = location.state[stateIndexKey];
      state = assignKeyAndIndex(currentIndex, state);
      tryNavigation({
        task: () => {
          opts.replaceState(path, state);
          notify({ type: "REPLACE" });
        },
        navigateOpts,
        type: "REPLACE",
        path,
        state
      });
    },
    go: (index, navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.go(index);
          handleIndexChange({
            type: "GO",
            index
          });
        },
        navigateOpts,
        type: "GO"
      });
    },
    back: (navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.back(navigateOpts?.ignoreBlocker ?? false);
          handleIndexChange({ type: "BACK" });
        },
        navigateOpts,
        type: "BACK"
      });
    },
    forward: (navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.forward(navigateOpts?.ignoreBlocker ?? false);
          handleIndexChange({ type: "FORWARD" });
        },
        navigateOpts,
        type: "FORWARD"
      });
    },
    canGoBack: () => location.state[stateIndexKey] !== 0,
    createHref: (str) => opts.createHref(str),
    block: (blocker) => {
      if (!opts.setBlockers) return () => {
      };
      const blockers = opts.getBlockers?.() ?? [];
      opts.setBlockers([...blockers, blocker]);
      return () => {
        const blockers2 = opts.getBlockers?.() ?? [];
        opts.setBlockers?.(blockers2.filter((b2) => b2 !== blocker));
      };
    },
    flush: () => opts.flush?.(),
    destroy: () => opts.destroy?.(),
    notify
  };
}
function assignKeyAndIndex(index, state) {
  if (!state) state = {};
  const key = createRandomKey();
  return {
    ...state,
    key,
    __TSR_key: key,
    [stateIndexKey]: index
  };
}
function createMemoryHistory(opts = { initialEntries: ["/"] }) {
  const entries = opts.initialEntries;
  let index = opts.initialIndex ? Math.min(Math.max(opts.initialIndex, 0), entries.length - 1) : entries.length - 1;
  const states = entries.map((_entry, index2) => assignKeyAndIndex(index2, void 0));
  const getLocation = () => parseHref(entries[index], states[index]);
  let blockers = [];
  const _getBlockers = () => blockers;
  const _setBlockers = (newBlockers) => blockers = newBlockers;
  return createHistory({
    getLocation,
    getLength: () => entries.length,
    pushState: (path, state) => {
      if (index < entries.length - 1) {
        entries.splice(index + 1);
        states.splice(index + 1);
      }
      states.push(state);
      entries.push(path);
      index = Math.max(entries.length - 1, 0);
    },
    replaceState: (path, state) => {
      states[index] = state;
      entries[index] = path;
    },
    back: () => {
      index = Math.max(index - 1, 0);
    },
    forward: () => {
      index = Math.min(index + 1, entries.length - 1);
    },
    go: (n) => {
      index = Math.min(Math.max(index + n, 0), entries.length - 1);
    },
    createHref: (path) => path,
    getBlockers: _getBlockers,
    setBlockers: _setBlockers
  });
}
function sanitizePath(path) {
  let sanitized = path.replace(/[\x00-\x1f\x7f]/g, "");
  if (sanitized.startsWith("//")) sanitized = "/" + sanitized.replace(/^\/+/, "");
  return sanitized;
}
function parseHref(href, state) {
  const sanitizedHref = sanitizePath(href);
  const hashIndex = sanitizedHref.indexOf("#");
  const searchIndex = sanitizedHref.indexOf("?");
  const addedKey = createRandomKey();
  return {
    href: sanitizedHref,
    pathname: sanitizedHref.substring(0, hashIndex > 0 ? searchIndex > 0 ? Math.min(hashIndex, searchIndex) : hashIndex : searchIndex > 0 ? searchIndex : sanitizedHref.length),
    hash: hashIndex > -1 ? sanitizedHref.substring(hashIndex) : "",
    search: searchIndex > -1 ? sanitizedHref.slice(searchIndex, hashIndex === -1 ? void 0 : hashIndex) : "",
    state: state || {
      [stateIndexKey]: 0,
      key: addedKey,
      __TSR_key: addedKey
    }
  };
}
function createRandomKey() {
  return (Math.random() + 1).toString(36).substring(7);
}
function resolveManifestAssetLink(link) {
  if (typeof link === "string") return {
    href: link,
    crossOrigin: void 0
  };
  return link;
}
var GLOBAL_TSR = "$_TSR";
var TSR_SCRIPT_BARRIER_ID = "$tsr-stream-barrier";
var L = ((i) => (i[i.AggregateError = 1] = "AggregateError", i[i.ArrowFunction = 2] = "ArrowFunction", i[i.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", i[i.ObjectAssign = 8] = "ObjectAssign", i[i.BigIntTypedArray = 16] = "BigIntTypedArray", i[i.RegExp = 32] = "RegExp", i))(L || {});
var v = Symbol.asyncIterator, dr = Symbol.hasInstance, R = Symbol.isConcatSpreadable, C = Symbol.iterator, gr = Symbol.match, yr = Symbol.matchAll, Nr = Symbol.replace, br = Symbol.search, vr = Symbol.species, Cr = Symbol.split, Ar = Symbol.toPrimitive, P$1 = Symbol.toStringTag, Er = Symbol.unscopables;
var nt = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, Ce = { [v]: 0, [dr]: 1, [R]: 2, [C]: 3, [gr]: 4, [yr]: 5, [Nr]: 6, [br]: 7, [vr]: 8, [Cr]: 9, [Ar]: 10, [P$1]: 11, [Er]: 12 }, ot = { 0: v, 1: dr, 2: R, 3: C, 4: gr, 5: yr, 6: Nr, 7: br, 8: vr, 9: Cr, 10: Ar, 11: P$1, 12: Er }, at = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, o$1 = void 0, st = { 2: true, 3: false, 1: o$1, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN };
var Ae = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, it = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function c(e, r, t, n, a, s, i, u, l2, g, S, d) {
  return { t: e, i: r, s: t, c: n, m: a, p: s, e: i, a: u, f: l2, b: g, o: S, l: d };
}
function B(e) {
  return c(2, o$1, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
var J = B(2), Z = B(3), Ee = B(1), Ie = B(0), ut = B(4), lt = B(5), ct = B(6), ft = B(7);
function dn(e) {
  switch (e) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return o$1;
  }
}
function y(e) {
  let r = "", t = 0, n;
  for (let a = 0, s = e.length; a < s; a++) n = dn(e[a]), n && (r += e.slice(t, a) + n, t = a + 1);
  return t === 0 ? r = e : r += e.slice(t), r;
}
function gn(e) {
  switch (e) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return e;
  }
}
function h(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, gn);
}
var U = "__SEROVAL_REFS__", le = "$R", Re = `self.${le}`;
function yn(e) {
  return e == null ? `${Re}=${Re}||[]` : `(${Re}=${Re}||{})["${y(e)}"]=[]`;
}
var Ir = /* @__PURE__ */ new Map(), j = /* @__PURE__ */ new Map();
function Rr(e) {
  return Ir.has(e);
}
function bn(e) {
  return j.has(e);
}
function St(e) {
  if (Rr(e)) return Ir.get(e);
  throw new Pe(e);
}
function mt(e) {
  if (bn(e)) return j.get(e);
  throw new xe(e);
}
typeof globalThis != "undefined" ? Object.defineProperty(globalThis, U, { value: j, configurable: true, writable: false, enumerable: false }) : typeof window != "undefined" ? Object.defineProperty(window, U, { value: j, configurable: true, writable: false, enumerable: false }) : typeof self != "undefined" ? Object.defineProperty(self, U, { value: j, configurable: true, writable: false, enumerable: false }) : typeof global != "undefined" && Object.defineProperty(global, U, { value: j, configurable: true, writable: false, enumerable: false });
function Te(e) {
  return e instanceof EvalError ? 1 : e instanceof RangeError ? 2 : e instanceof ReferenceError ? 3 : e instanceof SyntaxError ? 4 : e instanceof TypeError ? 5 : e instanceof URIError ? 6 : 0;
}
function vn(e) {
  let r = Ae[Te(e)];
  return e.name !== r ? { name: e.name } : e.constructor.name !== r ? { name: e.constructor.name } : {};
}
function $(e, r) {
  let t = vn(e), n = Object.getOwnPropertyNames(e);
  for (let a = 0, s = n.length, i; a < s; a++) i = n[a], i !== "name" && i !== "message" && (i === "stack" ? r & 4 && (t = t || {}, t[i] = e[i]) : (t = t || {}, t[i] = e[i]));
  return t;
}
function Oe(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : Object.isExtensible(e) ? 0 : 1;
}
function we(e) {
  switch (e) {
    case Number.POSITIVE_INFINITY:
      return lt;
    case Number.NEGATIVE_INFINITY:
      return ct;
  }
  return e !== e ? ft : Object.is(e, -0) ? ut : c(0, o$1, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function X(e) {
  return c(1, o$1, y(e), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function he(e) {
  return c(3, o$1, "" + e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function dt(e) {
  return c(4, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function ze(e, r) {
  let t = r.valueOf();
  return c(5, e, t !== t ? "" : r.toISOString(), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function _e(e, r) {
  return c(6, e, o$1, y(r.source), r.flags, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function gt(e, r) {
  return c(17, e, Ce[r], o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function yt(e, r) {
  return c(18, e, y(St(r)), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function ce(e, r, t) {
  return c(25, e, t, y(r), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function ke(e, r, t) {
  return c(9, e, o$1, o$1, o$1, o$1, o$1, t, o$1, o$1, Oe(r), o$1);
}
function De(e, r) {
  return c(21, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function Fe(e, r, t) {
  return c(15, e, o$1, r.constructor.name, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.length);
}
function Be(e, r, t) {
  return c(16, e, o$1, r.constructor.name, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.length);
}
function Ve(e, r, t) {
  return c(20, e, o$1, o$1, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.byteLength);
}
function Me(e, r, t) {
  return c(13, e, Te(r), o$1, y(r.message), t, o$1, o$1, o$1, o$1, o$1, o$1);
}
function Le(e, r, t) {
  return c(14, e, Te(r), o$1, y(r.message), t, o$1, o$1, o$1, o$1, o$1, o$1);
}
function Ue(e, r) {
  return c(7, e, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1, o$1);
}
function je(e, r) {
  return c(28, o$1, o$1, o$1, o$1, o$1, o$1, [e, r], o$1, o$1, o$1, o$1);
}
function Ye(e, r) {
  return c(30, o$1, o$1, o$1, o$1, o$1, o$1, [e, r], o$1, o$1, o$1, o$1);
}
function qe(e, r, t) {
  return c(31, e, o$1, o$1, o$1, o$1, o$1, t, r, o$1, o$1, o$1);
}
function We(e, r) {
  return c(32, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function Ke(e, r) {
  return c(33, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function Ge(e, r) {
  return c(34, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function He(e, r, t, n) {
  return c(35, e, t, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1, n);
}
var Cn = { parsing: 1, serialization: 2, deserialization: 3 };
function An(e) {
  return `Seroval Error (step: ${Cn[e]})`;
}
var En = (e, r) => An(e), fe = class extends Error {
  constructor(t, n) {
    super(En(t));
    this.cause = n;
  }
}, _ = class extends fe {
  constructor(r) {
    super("parsing", r);
  }
}, Je = class extends fe {
  constructor(r) {
    super("deserialization", r);
  }
};
function k(e) {
  return `Seroval Error (specific: ${e})`;
}
var x = class extends Error {
  constructor(t) {
    super(k(1));
    this.value = t;
  }
}, z = class extends Error {
  constructor(r) {
    super(k(2));
  }
}, Q = class extends Error {
  constructor(r) {
    super(k(3));
  }
}, V = class extends Error {
  constructor(r) {
    super(k(4));
  }
}, Pe = class extends Error {
  constructor(t) {
    super(k(5));
    this.value = t;
  }
}, xe = class extends Error {
  constructor(r) {
    super(k(6));
  }
}, Ze = class extends Error {
  constructor(r) {
    super(k(7));
  }
}, O = class extends Error {
  constructor(r) {
    super(k(8));
  }
}, M = class extends Error {
  constructor(r) {
    super(k(9));
  }
};
var Y = class {
  constructor(r, t) {
    this.value = r;
    this.replacement = t;
  }
};
var ee$1 = () => {
  let e = { p: 0, s: 0, f: 0 };
  return e.p = new Promise((r, t) => {
    e.s = r, e.f = t;
  }), e;
}, In = (e, r) => {
  e.s(r), e.p.s = 1, e.p.v = r;
}, Rn = (e, r) => {
  e.f(r), e.p.s = 2, e.p.v = r;
}, bt = ee$1.toString(), vt = In.toString(), Ct = Rn.toString(), xr = () => {
  let e = [], r = [], t = true, n = false, a = 0, s = (l2, g, S) => {
    for (S = 0; S < a; S++) r[S] && r[S][g](l2);
  }, i = (l2, g, S, d) => {
    for (g = 0, S = e.length; g < S; g++) d = e[g], !t && g === S - 1 ? l2[n ? "return" : "throw"](d) : l2.next(d);
  }, u = (l2, g) => (t && (g = a++, r[g] = l2), i(l2), () => {
    t && (r[g] = r[a], r[a--] = void 0);
  });
  return { __SEROVAL_STREAM__: true, on: (l2) => u(l2), next: (l2) => {
    t && (e.push(l2), s(l2, "next"));
  }, throw: (l2) => {
    t && (e.push(l2), s(l2, "throw"), t = false, n = false, r.length = 0);
  }, return: (l2) => {
    t && (e.push(l2), s(l2, "return"), t = false, n = true, r.length = 0);
  } };
}, At = xr.toString(), Tr = (e) => (r) => () => {
  let t = 0, n = { [e]: () => n, next: () => {
    if (t > r.d) return { done: true, value: void 0 };
    let a = t++, s = r.v[a];
    if (a === r.t) throw s;
    return { done: a === r.d, value: s };
  } };
  return n;
}, Et = Tr.toString(), Or = (e, r) => (t) => () => {
  let n = 0, a = -1, s = false, i = [], u = [], l2 = (S = 0, d = u.length) => {
    for (; S < d; S++) u[S].s({ done: true, value: void 0 });
  };
  t.on({ next: (S) => {
    let d = u.shift();
    d && d.s({ done: false, value: S }), i.push(S);
  }, throw: (S) => {
    let d = u.shift();
    d && d.f(S), l2(), a = i.length, s = true, i.push(S);
  }, return: (S) => {
    let d = u.shift();
    d && d.s({ done: true, value: S }), l2(), a = i.length, i.push(S);
  } });
  let g = { [e]: () => g, next: () => {
    if (a === -1) {
      let G = n++;
      if (G >= i.length) {
        let tt = r();
        return u.push(tt), tt.p;
      }
      return { done: false, value: i[G] };
    }
    if (n > a) return { done: true, value: void 0 };
    let S = n++, d = i[S];
    if (S !== a) return { done: false, value: d };
    if (s) throw d;
    return { done: true, value: d };
  } };
  return g;
}, It = Or.toString(), wr = (e) => {
  let r = atob(e), t = r.length, n = new Uint8Array(t);
  for (let a = 0; a < t; a++) n[a] = r.charCodeAt(a);
  return n.buffer;
}, Rt = wr.toString();
function $e(e) {
  return "__SEROVAL_SEQUENCE__" in e;
}
function hr(e, r, t) {
  return { __SEROVAL_SEQUENCE__: true, v: e, t: r, d: t };
}
function Xe(e) {
  let r = [], t = -1, n = -1, a = e[C]();
  for (; ; ) try {
    let s = a.next();
    if (r.push(s.value), s.done) {
      n = r.length - 1;
      break;
    }
  } catch (s) {
    t = r.length, r.push(s);
  }
  return hr(r, t, n);
}
var Pn = Tr(C);
function Pt(e) {
  return Pn(e);
}
var xt = {}, Tt = {};
var Ot = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, wt = { 0: "[]", 1: bt, 2: vt, 3: Ct, 4: At, 5: Rt };
function Qe(e) {
  return "__SEROVAL_STREAM__" in e;
}
function re$1() {
  return xr();
}
function er(e) {
  let r = re$1(), t = e[v]();
  async function n() {
    try {
      let a = await t.next();
      a.done ? r.return(a.value) : (r.next(a.value), await n());
    } catch (a) {
      r.throw(a);
    }
  }
  return n().catch(() => {
  }), r;
}
var xn = Or(v, ee$1);
function ht(e) {
  return xn(e);
}
async function zr(e) {
  try {
    return [1, await e];
  } catch (r) {
    return [0, r];
  }
}
function me(e, r) {
  return { plugins: r.plugins, mode: e, marked: /* @__PURE__ */ new Set(), features: 63 ^ (r.disabledFeatures || 0), refs: r.refs || /* @__PURE__ */ new Map(), depthLimit: r.depthLimit || 1e3 };
}
function pe(e, r) {
  e.marked.add(r);
}
function _r(e, r) {
  let t = e.refs.size;
  return e.refs.set(r, t), t;
}
function rr(e, r) {
  let t = e.refs.get(r);
  return t != null ? (pe(e, t), { type: 1, value: dt(t) }) : { type: 0, value: _r(e, r) };
}
function q(e, r) {
  let t = rr(e, r);
  return t.type === 1 ? t : Rr(r) ? { type: 2, value: yt(t.value, r) } : t;
}
function I(e, r) {
  let t = q(e, r);
  if (t.type !== 0) return t.value;
  if (r in Ce) return gt(t.value, r);
  throw new x(r);
}
function D(e, r) {
  let t = rr(e, Ot[r]);
  return t.type === 1 ? t.value : c(26, t.value, r, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function tr(e) {
  let r = rr(e, xt);
  return r.type === 1 ? r.value : c(27, r.value, o$1, o$1, o$1, o$1, o$1, o$1, I(e, C), o$1, o$1, o$1);
}
function nr(e) {
  let r = rr(e, Tt);
  return r.type === 1 ? r.value : c(29, r.value, o$1, o$1, o$1, o$1, o$1, [D(e, 1), I(e, v)], o$1, o$1, o$1, o$1);
}
function or(e, r, t, n) {
  return c(t ? 11 : 10, e, o$1, o$1, o$1, n, o$1, o$1, o$1, o$1, Oe(r), o$1);
}
function ar(e, r, t, n) {
  return c(8, r, o$1, o$1, o$1, o$1, { k: t, v: n }, o$1, D(e, 0), o$1, o$1, o$1);
}
function _t(e, r, t) {
  return c(22, r, t, o$1, o$1, o$1, o$1, o$1, D(e, 1), o$1, o$1, o$1);
}
function sr(e, r, t) {
  let n = new Uint8Array(t), a = "";
  for (let s = 0, i = n.length; s < i; s++) a += String.fromCharCode(n[s]);
  return c(19, r, y(btoa(a)), o$1, o$1, o$1, o$1, o$1, D(e, 5), o$1, o$1, o$1);
}
function te(e, r) {
  return { base: me(e, r), child: void 0 };
}
var Dr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  parse(r) {
    return N$1(this._p, this.depth, r);
  }
};
async function On(e, r, t) {
  let n = [];
  for (let a = 0, s = t.length; a < s; a++) a in t ? n[a] = await N$1(e, r, t[a]) : n[a] = 0;
  return n;
}
async function wn(e, r, t, n) {
  return ke(t, n, await On(e, r, n));
}
async function Fr(e, r, t) {
  let n = Object.entries(t), a = [], s = [];
  for (let i = 0, u = n.length; i < u; i++) a.push(y(n[i][0])), s.push(await N$1(e, r, n[i][1]));
  return C in t && (a.push(I(e.base, C)), s.push(je(tr(e.base), await N$1(e, r, Xe(t))))), v in t && (a.push(I(e.base, v)), s.push(Ye(nr(e.base), await N$1(e, r, er(t))))), P$1 in t && (a.push(I(e.base, P$1)), s.push(X(t[P$1]))), R in t && (a.push(I(e.base, R)), s.push(t[R] ? J : Z)), { k: a, v: s };
}
async function kr(e, r, t, n, a) {
  return or(t, n, a, await Fr(e, r, n));
}
async function hn(e, r, t, n) {
  return De(t, await N$1(e, r, n.valueOf()));
}
async function zn(e, r, t, n) {
  return Fe(t, n, await N$1(e, r, n.buffer));
}
async function _n(e, r, t, n) {
  return Be(t, n, await N$1(e, r, n.buffer));
}
async function kn(e, r, t, n) {
  return Ve(t, n, await N$1(e, r, n.buffer));
}
async function kt(e, r, t, n) {
  let a = $(n, e.base.features);
  return Me(t, n, a ? await Fr(e, r, a) : o$1);
}
async function Dn(e, r, t, n) {
  let a = $(n, e.base.features);
  return Le(t, n, a ? await Fr(e, r, a) : o$1);
}
async function Fn(e, r, t, n) {
  let a = [], s = [];
  for (let [i, u] of n.entries()) a.push(await N$1(e, r, i)), s.push(await N$1(e, r, u));
  return ar(e.base, t, a, s);
}
async function Bn(e, r, t, n) {
  let a = [];
  for (let s of n.keys()) a.push(await N$1(e, r, s));
  return Ue(t, a);
}
async function Dt(e, r, t, n) {
  let a = e.base.plugins;
  if (a) for (let s = 0, i = a.length; s < i; s++) {
    let u = a[s];
    if (u.parse.async && u.test(n)) return ce(t, u.tag, await u.parse.async(n, new Dr(e, r), { id: t }));
  }
  return o$1;
}
async function Vn(e, r, t, n) {
  let [a, s] = await zr(n);
  return c(12, t, a, o$1, o$1, o$1, o$1, o$1, await N$1(e, r, s), o$1, o$1, o$1);
}
function Mn(e, r, t, n, a) {
  let s = [], i = t.on({ next: (u) => {
    pe(this.base, r), N$1(this, e, u).then((l2) => {
      s.push(We(r, l2));
    }, (l2) => {
      a(l2), i();
    });
  }, throw: (u) => {
    pe(this.base, r), N$1(this, e, u).then((l2) => {
      s.push(Ke(r, l2)), n(s), i();
    }, (l2) => {
      a(l2), i();
    });
  }, return: (u) => {
    pe(this.base, r), N$1(this, e, u).then((l2) => {
      s.push(Ge(r, l2)), n(s), i();
    }, (l2) => {
      a(l2), i();
    });
  } });
}
async function Ln(e, r, t, n) {
  return qe(t, D(e.base, 4), await new Promise(Mn.bind(e, r, t, n)));
}
async function Un(e, r, t, n) {
  let a = [];
  for (let s = 0, i = n.v.length; s < i; s++) a[s] = await N$1(e, r, n.v[s]);
  return He(t, a, n.t, n.d);
}
async function jn(e, r, t, n) {
  if (Array.isArray(n)) return wn(e, r, t, n);
  if (Qe(n)) return Ln(e, r, t, n);
  if ($e(n)) return Un(e, r, t, n);
  let a = n.constructor;
  if (a === Y) return N$1(e, r, n.replacement);
  let s = await Dt(e, r, t, n);
  if (s) return s;
  switch (a) {
    case Object:
      return kr(e, r, t, n, false);
    case o$1:
      return kr(e, r, t, n, true);
    case Date:
      return ze(t, n);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return kt(e, r, t, n);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return hn(e, r, t, n);
    case ArrayBuffer:
      return sr(e.base, t, n);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return zn(e, r, t, n);
    case DataView:
      return kn(e, r, t, n);
    case Map:
      return Fn(e, r, t, n);
    case Set:
      return Bn(e, r, t, n);
  }
  if (a === Promise || n instanceof Promise) return Vn(e, r, t, n);
  let i = e.base.features;
  if (i & 32 && a === RegExp) return _e(t, n);
  if (i & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return _n(e, r, t, n);
  }
  if (i & 1 && typeof AggregateError != "undefined" && (a === AggregateError || n instanceof AggregateError)) return Dn(e, r, t, n);
  if (n instanceof Error) return kt(e, r, t, n);
  if (C in n || v in n) return kr(e, r, t, n, !!a);
  throw new x(n);
}
async function Yn(e, r, t) {
  let n = q(e.base, t);
  if (n.type !== 0) return n.value;
  let a = await Dt(e, r, n.value, t);
  if (a) return a;
  throw new x(t);
}
async function N$1(e, r, t) {
  if (r >= e.base.depthLimit) throw new M(e.base.depthLimit);
  switch (typeof t) {
    case "boolean":
      return t ? J : Z;
    case "undefined":
      return Ee;
    case "string":
      return X(t);
    case "number":
      return we(t);
    case "bigint":
      return he(t);
    case "object": {
      if (t) {
        let n = q(e.base, t);
        return n.type === 0 ? await jn(e, r + 1, n.value, t) : n.value;
      }
      return Ie;
    }
    case "symbol":
      return I(e.base, t);
    case "function":
      return Yn(e, r, t);
    default:
      throw new x(t);
  }
}
async function ne(e, r) {
  try {
    return await N$1(e, 0, r);
  } catch (t) {
    throw t instanceof _ ? t : new _(t);
  }
}
var oe = ((t) => (t[t.Vanilla = 1] = "Vanilla", t[t.Cross = 2] = "Cross", t))(oe || {});
function ai(e) {
  return e;
}
function Ft(e, r) {
  for (let t = 0, n = r.length; t < n; t++) {
    let a = r[t];
    e.has(a) || (e.add(a), a.extends && Ft(e, a.extends));
  }
}
function A(e) {
  if (e) {
    let r = /* @__PURE__ */ new Set();
    return Ft(r, e), [...r];
  }
}
function Bt(e) {
  switch (e) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new Ze(e);
  }
}
function de(e) {
  switch (e) {
    case "constructor":
    case "__proto__":
    case "prototype":
    case "__defineGetter__":
    case "__defineSetter__":
    case "__lookupGetter__":
    case "__lookupSetter__":
      return false;
    default:
      return true;
  }
}
function Vt(e) {
  switch (e) {
    case v:
    case R:
    case P$1:
    case C:
      return true;
    default:
      return false;
  }
}
var qn = 1e6, Wn = 1e4, Kn = 2e4;
function Lt(e, r) {
  switch (r) {
    case 3:
      return Object.freeze(e);
    case 1:
      return Object.preventExtensions(e);
    case 2:
      return Object.seal(e);
    default:
      return e;
  }
}
var Gn = 1e3;
function Ut(e, r) {
  var n;
  let t = r.refs || /* @__PURE__ */ new Map();
  return "types" in t || Object.assign(t, { types: /* @__PURE__ */ new Map() }), { mode: e, plugins: r.plugins, refs: t, features: (n = r.features) != null ? n : 63 ^ (r.disabledFeatures || 0), depthLimit: r.depthLimit || Gn };
}
function jt(e) {
  return { mode: 1, base: Ut(1, e), child: o$1, state: { marked: new Set(e.markedRefs) } };
}
var Br = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  deserialize(r) {
    return p(this._p, this.depth, r);
  }
};
function qt(e, r) {
  if (r < 0 || !Number.isFinite(r) || !Number.isInteger(r)) throw new O({ t: 4, i: r });
  if (e.refs.has(r)) throw new Error("Conflicted ref id: " + r);
}
function Hn(e, r, t) {
  return qt(e.base, r), e.state.marked.has(r) && e.base.refs.set(r, t), t;
}
function Jn(e, r, t) {
  return qt(e.base, r), e.base.refs.set(r, t), t;
}
function b(e, r, t) {
  return e.mode === 1 ? Hn(e, r, t) : Jn(e, r, t);
}
function Vr(e, r, t) {
  if (Object.hasOwn(r, t)) return r[t];
  throw new O(e);
}
function Zn(e, r) {
  return b(e, r.i, mt(h(r.s)));
}
function $n(e, r, t) {
  let n = t.a, a = n.length, s = b(e, t.i, new Array(a));
  for (let i = 0, u; i < a; i++) u = n[i], u && (s[i] = p(e, r, u));
  return Lt(s, t.o), s;
}
function Mt(e, r, t) {
  de(r) ? e[r] = t : Object.defineProperty(e, r, { value: t, configurable: true, enumerable: true, writable: true });
}
function Xn(e, r, t, n, a) {
  if (typeof n == "string") Mt(t, h(n), p(e, r, a));
  else {
    let s = p(e, r, n);
    switch (typeof s) {
      case "string":
        Mt(t, s, p(e, r, a));
        break;
      case "symbol":
        Vt(s) && (t[s] = p(e, r, a));
        break;
      default:
        throw new O(n);
    }
  }
}
function Wt(e, r, t) {
  e.base.refs.types.set(r, t);
}
function ge(e, r, t, n) {
  if (e.base.refs.types.get(t) !== n) throw new O(r);
}
function Kt(e, r, t, n) {
  let a = t.k;
  if (a.length > 0) for (let i = 0, u = t.v, l2 = a.length; i < l2; i++) Xn(e, r, n, a[i], u[i]);
  return n;
}
function Qn(e, r, t) {
  let n = b(e, t.i, t.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  return Kt(e, r, t.p, n), Lt(n, t.o), n;
}
function eo(e, r) {
  return b(e, r.i, new Date(r.s));
}
function ro(e, r) {
  if (e.base.features & 32) {
    let t = h(r.c);
    if (t.length > Kn) throw new O(r);
    return b(e, r.i, new RegExp(t, r.m));
  }
  throw new z(r);
}
function to(e, r, t) {
  let n = b(e, t.i, /* @__PURE__ */ new Set());
  for (let a = 0, s = t.a, i = s.length; a < i; a++) n.add(p(e, r, s[a]));
  return n;
}
function no(e, r, t) {
  let n = b(e, t.i, /* @__PURE__ */ new Map());
  for (let a = 0, s = t.e.k, i = t.e.v, u = s.length; a < u; a++) n.set(p(e, r, s[a]), p(e, r, i[a]));
  return n;
}
function oo(e, r) {
  if (r.s.length > qn) throw new O(r);
  return b(e, r.i, wr(h(r.s)));
}
function ao(e, r, t) {
  var u;
  let n = Bt(t.c), a = p(e, r, t.f), s = (u = t.b) != null ? u : 0;
  if (s < 0 || s > a.byteLength) throw new O(t);
  return b(e, t.i, new n(a, s, t.l));
}
function so(e, r, t) {
  var i;
  let n = p(e, r, t.f), a = (i = t.b) != null ? i : 0;
  if (a < 0 || a > n.byteLength) throw new O(t);
  return b(e, t.i, new DataView(n, a, t.l));
}
function Gt(e, r, t, n) {
  if (t.p) {
    let a = Kt(e, r, t.p, {});
    Object.defineProperties(n, Object.getOwnPropertyDescriptors(a));
  }
  return n;
}
function io(e, r, t) {
  let n = b(e, t.i, new AggregateError([], h(t.m)));
  return Gt(e, r, t, n);
}
function uo(e, r, t) {
  let n = Vr(t, it, t.s), a = b(e, t.i, new n(h(t.m)));
  return Gt(e, r, t, a);
}
function lo(e, r, t) {
  let n = ee$1(), a = b(e, t.i, n.p), s = p(e, r, t.f);
  return t.s ? n.s(s) : n.f(s), a;
}
function co(e, r, t) {
  return b(e, t.i, Object(p(e, r, t.f)));
}
function fo(e, r, t) {
  let n = e.base.plugins;
  if (n) {
    let a = h(t.c);
    for (let s = 0, i = n.length; s < i; s++) {
      let u = n[s];
      if (u.tag === a) return b(e, t.i, u.deserialize(t.s, new Br(e, r), { id: t.i }));
    }
  }
  throw new Q(t.c);
}
function So(e, r) {
  let t = b(e, r.i, b(e, r.s, ee$1()).p);
  return Wt(e, r.s, 22), t;
}
function mo(e, r, t) {
  let n = e.base.refs.get(t.i);
  if (n) return ge(e, t, t.i, 22), n.s(p(e, r, t.a[1])), o$1;
  throw new V("Promise");
}
function po(e, r, t) {
  let n = e.base.refs.get(t.i);
  if (n) return ge(e, t, t.i, 22), n.f(p(e, r, t.a[1])), o$1;
  throw new V("Promise");
}
function go(e, r, t) {
  p(e, r, t.a[0]);
  let n = p(e, r, t.a[1]);
  return Pt(n);
}
function yo(e, r, t) {
  p(e, r, t.a[0]);
  let n = p(e, r, t.a[1]);
  return ht(n);
}
function No(e, r, t) {
  let n = b(e, t.i, re$1());
  Wt(e, t.i, 31);
  let a = t.a, s = a.length;
  if (s) for (let i = 0; i < s; i++) p(e, r, a[i]);
  return n;
}
function bo(e, r, t) {
  let n = e.base.refs.get(t.i);
  if (n) return ge(e, t, t.i, 31), n.next(p(e, r, t.f)), o$1;
  throw new V("Stream");
}
function vo(e, r, t) {
  let n = e.base.refs.get(t.i);
  if (n) return ge(e, t, t.i, 31), n.throw(p(e, r, t.f)), o$1;
  throw new V("Stream");
}
function Co(e, r, t) {
  let n = e.base.refs.get(t.i);
  if (n) return ge(e, t, t.i, 31), n.return(p(e, r, t.f)), o$1;
  throw new V("Stream");
}
function Ao(e, r, t) {
  return p(e, r, t.f), o$1;
}
function Eo(e, r, t) {
  return p(e, r, t.a[1]), o$1;
}
function Io(e, r, t) {
  let n = b(e, t.i, hr([], t.s, t.l));
  for (let a = 0, s = t.a.length; a < s; a++) n.v[a] = p(e, r, t.a[a]);
  return n;
}
function p(e, r, t) {
  if (r > e.base.depthLimit) throw new M(e.base.depthLimit);
  switch (r += 1, t.t) {
    case 2:
      return Vr(t, st, t.s);
    case 0:
      return Number(t.s);
    case 1:
      return h(String(t.s));
    case 3:
      if (String(t.s).length > Wn) throw new O(t);
      return BigInt(t.s);
    case 4:
      return e.base.refs.get(t.i);
    case 18:
      return Zn(e, t);
    case 9:
      return $n(e, r, t);
    case 10:
    case 11:
      return Qn(e, r, t);
    case 5:
      return eo(e, t);
    case 6:
      return ro(e, t);
    case 7:
      return to(e, r, t);
    case 8:
      return no(e, r, t);
    case 19:
      return oo(e, t);
    case 16:
    case 15:
      return ao(e, r, t);
    case 20:
      return so(e, r, t);
    case 14:
      return io(e, r, t);
    case 13:
      return uo(e, r, t);
    case 12:
      return lo(e, r, t);
    case 17:
      return Vr(t, ot, t.s);
    case 21:
      return co(e, r, t);
    case 25:
      return fo(e, r, t);
    case 22:
      return So(e, t);
    case 23:
      return mo(e, r, t);
    case 24:
      return po(e, r, t);
    case 28:
      return go(e, r, t);
    case 30:
      return yo(e, r, t);
    case 31:
      return No(e, r, t);
    case 32:
      return bo(e, r, t);
    case 33:
      return vo(e, r, t);
    case 34:
      return Co(e, r, t);
    case 27:
      return Ao(e, r, t);
    case 29:
      return Eo(e, r, t);
    case 35:
      return Io(e, r, t);
    default:
      throw new z(t);
  }
}
function ir(e, r) {
  try {
    return p(e, 0, r);
  } catch (t) {
    throw new Je(t);
  }
}
var Ro = () => T, Po = Ro.toString(), Ht = /=>/.test(Po);
function ur(e, r) {
  return Ht ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (r.startsWith("{") ? "(" + r + ")" : r) : "function(" + e.join(",") + "){return " + r + "}";
}
function Jt(e, r) {
  return Ht ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + r + "}" : "function(" + e.join(",") + "){" + r + "}";
}
var Xt = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", Zt = Xt.length, Qt = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", $t = Qt.length;
function Mr(e) {
  let r = e % Zt, t = Xt[r];
  for (e = (e - r) / Zt; e > 0; ) r = e % $t, t += Qt[r], e = (e - r) / $t;
  return t;
}
var xo = /^[$A-Z_][0-9A-Z_$]*$/i;
function Lr(e) {
  let r = e[0];
  return (r === "$" || r === "_" || r >= "A" && r <= "Z" || r >= "a" && r <= "z") && xo.test(e);
}
function Ne(e) {
  switch (e.t) {
    case 0:
      return e.s + "=" + e.v;
    case 2:
      return e.s + ".set(" + e.k + "," + e.v + ")";
    case 1:
      return e.s + ".add(" + e.v + ")";
    case 3:
      return e.s + ".delete(" + e.k + ")";
    case 4:
      return "Object.defineProperty(" + e.s + ',"__proto__",{value:' + e.k + ",configurable:!0,enumerable:!0,writable:!0})";
  }
}
function To(e) {
  let r = [], t = e[0];
  for (let n = 1, a = e.length, s, i = t; n < a; n++) s = e[n], s.t === 0 && s.v === i.v ? t = { t: 0, s: s.s, k: o$1, v: Ne(t) } : s.t === 2 && s.s === i.s ? t = { t: 2, s: Ne(t), k: s.k, v: s.v } : s.t === 1 && s.s === i.s ? t = { t: 1, s: Ne(t), k: o$1, v: s.v } : s.t === 3 && s.s === i.s ? t = { t: 3, s: Ne(t), k: s.k, v: o$1 } : (r.push(t), t = s), i = s;
  return r.push(t), r;
}
function sn(e) {
  if (e.length) {
    let r = "", t = To(e);
    for (let n = 0, a = t.length; n < a; n++) r += Ne(t[n]) + ",";
    return r;
  }
  return o$1;
}
var Oo = "Object.create(null)", wo = "new Set", ho = "new Map", zo = "Promise.resolve", _o = "Promise.reject", ko = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: o$1 };
function un(e, r) {
  return { mode: e, plugins: r.plugins, features: r.features, marked: new Set(r.markedRefs), stack: [], flags: [], assignments: [] };
}
function cr(e) {
  return { mode: 2, base: un(2, e), state: e, child: o$1 };
}
var Ur = class {
  constructor(r) {
    this._p = r;
  }
  serialize(r) {
    return f(this._p, r);
  }
};
function Fo(e, r) {
  let t = e.valid.get(r);
  t == null && (t = e.valid.size, e.valid.set(r, t));
  let n = e.vars[t];
  return n == null && (n = Mr(t), e.vars[t] = n), n;
}
function Bo(e) {
  return le + "[" + e + "]";
}
function m(e, r) {
  return e.mode === 1 ? Fo(e.state, r) : Bo(r);
}
function w$1(e, r) {
  e.marked.add(r);
}
function jr(e, r) {
  return e.marked.has(r);
}
function qr(e, r, t) {
  r !== 0 && (w$1(e.base, t), e.base.flags.push({ type: r, value: m(e, t) }));
}
function Vo(e) {
  let r = "";
  for (let t = 0, n = e.flags, a = n.length; t < a; t++) {
    let s = n[t];
    r += ko[s.type] + "(" + s.value + "),";
  }
  return r;
}
function ln(e) {
  let r = sn(e.assignments), t = Vo(e);
  return r ? t ? r + t : r : t;
}
function Wr(e, r, t) {
  e.assignments.push({ t: 0, s: r, k: o$1, v: t });
}
function Mo(e, r, t) {
  e.base.assignments.push({ t: 1, s: m(e, r), k: o$1, v: t });
}
function ye(e, r, t, n) {
  e.base.assignments.push({ t: 2, s: m(e, r), k: t, v: n });
}
function en(e, r, t) {
  e.base.assignments.push({ t: 3, s: m(e, r), k: t, v: o$1 });
}
function be(e, r, t, n) {
  Wr(e.base, m(e, r) + "[" + t + "]", n);
}
function Yr(e, r, t, n) {
  if (!de(t)) {
    e.base.assignments.push({ t: 4, s: m(e, r), k: n, v: o$1 });
    return;
  }
  Wr(e.base, m(e, r) + "." + t, n);
}
function Lo(e, r, t, n) {
  Wr(e.base, m(e, r) + ".v[" + t + "]", n);
}
function F(e, r) {
  return r.t === 4 && e.stack.includes(r.i);
}
function ae$1(e, r, t) {
  return e.mode === 1 && !jr(e.base, r) ? t : m(e, r) + "=" + t;
}
function Uo(e) {
  return U + '.get("' + e.s + '")';
}
function rn(e, r, t, n) {
  return t ? F(e.base, t) ? (w$1(e.base, r), be(e, r, n, m(e, t.i)), "") : f(e, t) : "";
}
function jo(e, r) {
  let t = r.i, n = r.a, a = n.length;
  if (a > 0) {
    e.base.stack.push(t);
    let s = rn(e, t, n[0], 0), i = s === "";
    for (let u = 1, l2; u < a; u++) l2 = rn(e, t, n[u], u), s += "," + l2, i = l2 === "";
    return e.base.stack.pop(), qr(e, r.o, r.i), "[" + s + (i ? ",]" : "]");
  }
  return "[]";
}
function tn(e, r, t, n) {
  if (typeof t == "string") {
    let a = Number(t), s = a >= 0 && a.toString() === t || Lr(t);
    if (F(e.base, n)) {
      let i = m(e, n.i);
      return w$1(e.base, r.i), s && a !== a ? Yr(e, r.i, t, i) : be(e, r.i, s ? t : '"' + t + '"', i), "";
    }
    return de(t) ? (s ? t : '"' + t + '"') + ":" + f(e, n) : '["' + t + '"]:' + f(e, n);
  }
  return "[" + f(e, t) + "]:" + f(e, n);
}
function cn(e, r, t) {
  let n = t.k, a = n.length;
  if (a > 0) {
    let s = t.v;
    e.base.stack.push(r.i);
    let i = tn(e, r, n[0], s[0]);
    for (let u = 1, l2 = i; u < a; u++) l2 = tn(e, r, n[u], s[u]), i += (l2 && i && ",") + l2;
    return e.base.stack.pop(), "{" + i + "}";
  }
  return "{}";
}
function Yo(e, r) {
  return qr(e, r.o, r.i), cn(e, r, r.p);
}
function qo(e, r, t, n) {
  let a = cn(e, r, t);
  return a !== "{}" ? "Object.assign(" + n + "," + a + ")" : n;
}
function Wo(e, r, t, n, a) {
  let s = e.base, i = f(e, a), u = Number(n), l2 = u >= 0 && u.toString() === n || Lr(n);
  if (F(s, a)) l2 && u !== u ? Yr(e, r.i, n, i) : be(e, r.i, l2 ? n : '"' + n + '"', i);
  else {
    let g = s.assignments;
    s.assignments = t, l2 && u !== u ? Yr(e, r.i, n, i) : be(e, r.i, l2 ? n : '"' + n + '"', i), s.assignments = g;
  }
}
function Ko(e, r, t, n, a) {
  if (typeof n == "string") Wo(e, r, t, n, a);
  else {
    let s = e.base, i = s.stack;
    s.stack = [];
    let u = f(e, a);
    s.stack = i;
    let l2 = s.assignments;
    s.assignments = t, be(e, r.i, f(e, n), u), s.assignments = l2;
  }
}
function Go(e, r, t) {
  let n = t.k, a = n.length;
  if (a > 0) {
    let s = [], i = t.v;
    e.base.stack.push(r.i);
    for (let u = 0; u < a; u++) Ko(e, r, s, n[u], i[u]);
    return e.base.stack.pop(), sn(s);
  }
  return o$1;
}
function Kr(e, r, t) {
  if (r.p) {
    let n = e.base;
    if (n.features & 8) t = qo(e, r, r.p, t);
    else {
      w$1(n, r.i);
      let a = Go(e, r, r.p);
      if (a) return "(" + ae$1(e, r.i, t) + "," + a + m(e, r.i) + ")";
    }
  }
  return t;
}
function Ho(e, r) {
  return qr(e, r.o, r.i), Kr(e, r, Oo);
}
function Jo(e) {
  return 'new Date("' + e.s + '")';
}
function Zo(e, r) {
  if (e.base.features & 32) return "/" + h(r.c) + "/" + r.m;
  throw new z(r);
}
function nn(e, r, t) {
  let n = e.base;
  return F(n, t) ? (w$1(n, r), Mo(e, r, m(e, t.i)), "") : f(e, t);
}
function $o(e, r) {
  let t = wo, n = r.a, a = n.length, s = r.i;
  if (a > 0) {
    e.base.stack.push(s);
    let i = nn(e, s, n[0]);
    for (let u = 1, l2 = i; u < a; u++) l2 = nn(e, s, n[u]), i += (l2 && i && ",") + l2;
    e.base.stack.pop(), i && (t += "([" + i + "])");
  }
  return t;
}
function on(e, r, t, n, a) {
  let s = e.base;
  if (F(s, t)) {
    let i = m(e, t.i);
    if (w$1(s, r), F(s, n)) {
      let l2 = m(e, n.i);
      return ye(e, r, i, l2), "";
    }
    if (n.t !== 4 && n.i != null && jr(s, n.i)) {
      let l2 = "(" + f(e, n) + ",[" + a + "," + a + "])";
      return ye(e, r, i, m(e, n.i)), en(e, r, a), l2;
    }
    let u = s.stack;
    return s.stack = [], ye(e, r, i, f(e, n)), s.stack = u, "";
  }
  if (F(s, n)) {
    let i = m(e, n.i);
    if (w$1(s, r), t.t !== 4 && t.i != null && jr(s, t.i)) {
      let l2 = "(" + f(e, t) + ",[" + a + "," + a + "])";
      return ye(e, r, m(e, t.i), i), en(e, r, a), l2;
    }
    let u = s.stack;
    return s.stack = [], ye(e, r, f(e, t), i), s.stack = u, "";
  }
  return "[" + f(e, t) + "," + f(e, n) + "]";
}
function Xo(e, r) {
  let t = ho, n = r.e.k, a = n.length, s = r.i, i = r.f, u = m(e, i.i), l2 = e.base;
  if (a > 0) {
    let g = r.e.v;
    l2.stack.push(s);
    let S = on(e, s, n[0], g[0], u);
    for (let d = 1, G = S; d < a; d++) G = on(e, s, n[d], g[d], u), S += (G && S && ",") + G;
    l2.stack.pop(), S && (t += "([" + S + "])");
  }
  return i.t === 26 && (w$1(l2, i.i), t = "(" + f(e, i) + "," + t + ")"), t;
}
function Qo(e, r) {
  return W(e, r.f) + '("' + r.s + '")';
}
function ea(e, r) {
  return "new " + r.c + "(" + f(e, r.f) + "," + r.b + "," + r.l + ")";
}
function ra(e, r) {
  return "new DataView(" + f(e, r.f) + "," + r.b + "," + r.l + ")";
}
function ta(e, r) {
  let t = r.i;
  e.base.stack.push(t);
  let n = Kr(e, r, 'new AggregateError([],"' + r.m + '")');
  return e.base.stack.pop(), n;
}
function na(e, r) {
  return Kr(e, r, "new " + Ae[r.s] + '("' + r.m + '")');
}
function oa(e, r) {
  let t, n = r.f, a = r.i, s = r.s ? zo : _o, i = e.base;
  if (F(i, n)) {
    let u = m(e, n.i);
    t = s + (r.s ? "().then(" + ur([], u) + ")" : "().catch(" + Jt([], "throw " + u) + ")");
  } else {
    i.stack.push(a);
    let u = f(e, n);
    i.stack.pop(), t = s + "(" + u + ")";
  }
  return t;
}
function aa(e, r) {
  return "Object(" + f(e, r.f) + ")";
}
function W(e, r) {
  let t = f(e, r);
  return r.t === 4 ? t : "(" + t + ")";
}
function sa(e, r) {
  if (e.mode === 1) throw new z(r);
  return "(" + ae$1(e, r.s, W(e, r.f) + "()") + ").p";
}
function ia(e, r) {
  if (e.mode === 1) throw new z(r);
  return W(e, r.a[0]) + "(" + m(e, r.i) + "," + f(e, r.a[1]) + ")";
}
function ua(e, r) {
  if (e.mode === 1) throw new z(r);
  return W(e, r.a[0]) + "(" + m(e, r.i) + "," + f(e, r.a[1]) + ")";
}
function la(e, r) {
  let t = e.base.plugins;
  if (t) for (let n = 0, a = t.length; n < a; n++) {
    let s = t[n];
    if (s.tag === r.c) return e.child == null && (e.child = new Ur(e)), s.serialize(r.s, e.child, { id: r.i });
  }
  throw new Q(r.c);
}
function ca(e, r) {
  let t = "", n = false;
  return r.f.t !== 4 && (w$1(e.base, r.f.i), t = "(" + f(e, r.f) + ",", n = true), t += ae$1(e, r.i, "(" + Et + ")(" + m(e, r.f.i) + ")"), n && (t += ")"), t;
}
function fa(e, r) {
  return W(e, r.a[0]) + "(" + f(e, r.a[1]) + ")";
}
function Sa(e, r) {
  let t = r.a[0], n = r.a[1], a = e.base, s = "";
  t.t !== 4 && (w$1(a, t.i), s += "(" + f(e, t)), n.t !== 4 && (w$1(a, n.i), s += (s ? "," : "(") + f(e, n)), s && (s += ",");
  let i = ae$1(e, r.i, "(" + It + ")(" + m(e, n.i) + "," + m(e, t.i) + ")");
  return s ? s + i + ")" : i;
}
function ma(e, r) {
  return W(e, r.a[0]) + "(" + f(e, r.a[1]) + ")";
}
function pa(e, r) {
  let t = ae$1(e, r.i, W(e, r.f) + "()"), n = r.a.length;
  if (n) {
    let a = f(e, r.a[0]);
    for (let s = 1; s < n; s++) a += "," + f(e, r.a[s]);
    return "(" + t + "," + a + "," + m(e, r.i) + ")";
  }
  return t;
}
function da(e, r) {
  return m(e, r.i) + ".next(" + f(e, r.f) + ")";
}
function ga(e, r) {
  return m(e, r.i) + ".throw(" + f(e, r.f) + ")";
}
function ya(e, r) {
  return m(e, r.i) + ".return(" + f(e, r.f) + ")";
}
function an(e, r, t, n) {
  let a = e.base;
  return F(a, n) ? (w$1(a, r), Lo(e, r, t, m(e, n.i)), "") : f(e, n);
}
function Na(e, r) {
  let t = r.a, n = t.length, a = r.i;
  if (n > 0) {
    e.base.stack.push(a);
    let s = an(e, a, 0, t[0]);
    for (let i = 1, u = s; i < n; i++) u = an(e, a, i, t[i]), s += (u && s && ",") + u;
    if (e.base.stack.pop(), s) return "{__SEROVAL_SEQUENCE__:!0,v:[" + s + "],t:" + r.s + ",d:" + r.l + "}";
  }
  return "{__SEROVAL_SEQUENCE__:!0,v:[],t:-1,d:0}";
}
function ba(e, r) {
  switch (r.t) {
    case 17:
      return nt[r.s];
    case 18:
      return Uo(r);
    case 9:
      return jo(e, r);
    case 10:
      return Yo(e, r);
    case 11:
      return Ho(e, r);
    case 5:
      return Jo(r);
    case 6:
      return Zo(e, r);
    case 7:
      return $o(e, r);
    case 8:
      return Xo(e, r);
    case 19:
      return Qo(e, r);
    case 16:
    case 15:
      return ea(e, r);
    case 20:
      return ra(e, r);
    case 14:
      return ta(e, r);
    case 13:
      return na(e, r);
    case 12:
      return oa(e, r);
    case 21:
      return aa(e, r);
    case 22:
      return sa(e, r);
    case 25:
      return la(e, r);
    case 26:
      return wt[r.s];
    case 35:
      return Na(e, r);
    default:
      throw new z(r);
  }
}
function f(e, r) {
  switch (r.t) {
    case 2:
      return at[r.s];
    case 0:
      return "" + r.s;
    case 1:
      return '"' + r.s + '"';
    case 3:
      return r.s + "n";
    case 4:
      return m(e, r.i);
    case 23:
      return ia(e, r);
    case 24:
      return ua(e, r);
    case 27:
      return ca(e, r);
    case 28:
      return fa(e, r);
    case 29:
      return Sa(e, r);
    case 30:
      return ma(e, r);
    case 31:
      return pa(e, r);
    case 32:
      return da(e, r);
    case 33:
      return ga(e, r);
    case 34:
      return ya(e, r);
    default:
      return ae$1(e, r.i, ba(e, r));
  }
}
function Sr(e, r) {
  let t = f(e, r), n = r.i;
  if (n == null) return t;
  let a = ln(e.base), s = m(e, n), i = e.state.scopeId, u = i == null ? "" : le, l2 = a ? "(" + t + "," + a + s + ")" : t;
  if (u === "") return r.t === 10 && !a ? "(" + l2 + ")" : l2;
  let g = i == null ? "()" : "(" + le + '["' + y(i) + '"])';
  return "(" + ur([u], l2) + ")" + g;
}
var Hr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  parse(r) {
    return E(this._p, this.depth, r);
  }
}, Jr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  parse(r) {
    return E(this._p, this.depth, r);
  }
  parseWithError(r) {
    return K(this._p, this.depth, r);
  }
  isAlive() {
    return this._p.state.alive;
  }
  pushPendingState() {
    et(this._p);
  }
  popPendingState() {
    ve(this._p);
  }
  onParse(r) {
    se(this._p, r);
  }
  onError(r) {
    Xr(this._p, r);
  }
  addCleanup(r) {
    this._p.state.cleanups.push(r);
  }
};
function va(e) {
  return { alive: true, pending: 0, initial: true, buffer: [], onParse: e.onParse, onError: e.onError, onDone: e.onDone, cleanups: [] };
}
function Zr(e) {
  return { type: 2, base: me(2, e), state: va(e) };
}
function Ca(e, r, t) {
  let n = [];
  for (let a = 0, s = t.length; a < s; a++) a in t ? n[a] = E(e, r, t[a]) : n[a] = 0;
  return n;
}
function Aa(e, r, t, n) {
  return ke(t, n, Ca(e, r, n));
}
function $r(e, r, t) {
  let n = Object.entries(t), a = [], s = [];
  for (let i = 0, u = n.length; i < u; i++) a.push(y(n[i][0])), s.push(E(e, r, n[i][1]));
  return C in t && (a.push(I(e.base, C)), s.push(je(tr(e.base), E(e, r, Xe(t))))), v in t && (a.push(I(e.base, v)), s.push(Ye(nr(e.base), E(e, r, e.type === 1 ? re$1() : er(t))))), P$1 in t && (a.push(I(e.base, P$1)), s.push(X(t[P$1]))), R in t && (a.push(I(e.base, R)), s.push(t[R] ? J : Z)), { k: a, v: s };
}
function Gr(e, r, t, n, a) {
  return or(t, n, a, $r(e, r, n));
}
function Ea(e, r, t, n) {
  return De(t, E(e, r, n.valueOf()));
}
function Ia(e, r, t, n) {
  return Fe(t, n, E(e, r, n.buffer));
}
function Ra(e, r, t, n) {
  return Be(t, n, E(e, r, n.buffer));
}
function Pa(e, r, t, n) {
  return Ve(t, n, E(e, r, n.buffer));
}
function fn(e, r, t, n) {
  let a = $(n, e.base.features);
  return Me(t, n, a ? $r(e, r, a) : o$1);
}
function xa(e, r, t, n) {
  let a = $(n, e.base.features);
  return Le(t, n, a ? $r(e, r, a) : o$1);
}
function Ta(e, r, t, n) {
  let a = [], s = [];
  for (let [i, u] of n.entries()) a.push(E(e, r, i)), s.push(E(e, r, u));
  return ar(e.base, t, a, s);
}
function Oa(e, r, t, n) {
  let a = [];
  for (let s of n.keys()) a.push(E(e, r, s));
  return Ue(t, a);
}
function wa(e, r, t, n) {
  let a = qe(t, D(e.base, 4), []);
  return e.type === 1 || (et(e), n.on({ next: (s) => {
    if (e.state.alive) {
      let i = K(e, r, s);
      i && se(e, We(t, i));
    }
  }, throw: (s) => {
    if (e.state.alive) {
      let i = K(e, r, s);
      i && se(e, Ke(t, i));
    }
    ve(e);
  }, return: (s) => {
    if (e.state.alive) {
      let i = K(e, r, s);
      i && se(e, Ge(t, i));
    }
    ve(e);
  } })), a;
}
function ha(e, r, t) {
  if (this.state.alive) {
    let n = K(this, r, t);
    n && se(this, c(23, e, o$1, o$1, o$1, o$1, o$1, [D(this.base, 2), n], o$1, o$1, o$1, o$1)), ve(this);
  }
}
function za(e, r, t) {
  if (this.state.alive) {
    let n = K(this, r, t);
    n && se(this, c(24, e, o$1, o$1, o$1, o$1, o$1, [D(this.base, 3), n], o$1, o$1, o$1, o$1));
  }
  ve(this);
}
function _a(e, r, t, n) {
  let a = _r(e.base, {});
  return e.type === 2 && (et(e), n.then(ha.bind(e, a, r), za.bind(e, a, r))), _t(e.base, t, a);
}
function ka(e, r, t, n, a) {
  for (let s = 0, i = a.length; s < i; s++) {
    let u = a[s];
    if (u.parse.sync && u.test(n)) return ce(t, u.tag, u.parse.sync(n, new Hr(e, r), { id: t }));
  }
  return o$1;
}
function Da(e, r, t, n, a) {
  for (let s = 0, i = a.length; s < i; s++) {
    let u = a[s];
    if (u.parse.stream && u.test(n)) return ce(t, u.tag, u.parse.stream(n, new Jr(e, r), { id: t }));
  }
  return o$1;
}
function Sn(e, r, t, n) {
  let a = e.base.plugins;
  return a ? e.type === 1 ? ka(e, r, t, n, a) : Da(e, r, t, n, a) : o$1;
}
function Fa(e, r, t, n) {
  let a = [];
  for (let s = 0, i = n.v.length; s < i; s++) a[s] = E(e, r, n.v[s]);
  return He(t, a, n.t, n.d);
}
function Ba(e, r, t, n, a) {
  switch (a) {
    case Object:
      return Gr(e, r, t, n, false);
    case o$1:
      return Gr(e, r, t, n, true);
    case Date:
      return ze(t, n);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return fn(e, r, t, n);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return Ea(e, r, t, n);
    case ArrayBuffer:
      return sr(e.base, t, n);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return Ia(e, r, t, n);
    case DataView:
      return Pa(e, r, t, n);
    case Map:
      return Ta(e, r, t, n);
    case Set:
      return Oa(e, r, t, n);
  }
  if (a === Promise || n instanceof Promise) return _a(e, r, t, n);
  let s = e.base.features;
  if (s & 32 && a === RegExp) return _e(t, n);
  if (s & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return Ra(e, r, t, n);
  }
  if (s & 1 && typeof AggregateError != "undefined" && (a === AggregateError || n instanceof AggregateError)) return xa(e, r, t, n);
  if (n instanceof Error) return fn(e, r, t, n);
  if (C in n || v in n) return Gr(e, r, t, n, !!a);
  throw new x(n);
}
function Va(e, r, t, n) {
  if (Array.isArray(n)) return Aa(e, r, t, n);
  if (Qe(n)) return wa(e, r, t, n);
  if ($e(n)) return Fa(e, r, t, n);
  let a = n.constructor;
  if (a === Y) return E(e, r, n.replacement);
  let s = Sn(e, r, t, n);
  return s || Ba(e, r, t, n, a);
}
function Ma(e, r, t) {
  let n = q(e.base, t);
  if (n.type !== 0) return n.value;
  let a = Sn(e, r, n.value, t);
  if (a) return a;
  throw new x(t);
}
function E(e, r, t) {
  if (r >= e.base.depthLimit) throw new M(e.base.depthLimit);
  switch (typeof t) {
    case "boolean":
      return t ? J : Z;
    case "undefined":
      return Ee;
    case "string":
      return X(t);
    case "number":
      return we(t);
    case "bigint":
      return he(t);
    case "object": {
      if (t) {
        let n = q(e.base, t);
        return n.type === 0 ? Va(e, r + 1, n.value, t) : n.value;
      }
      return Ie;
    }
    case "symbol":
      return I(e.base, t);
    case "function":
      return Ma(e, r, t);
    default:
      throw new x(t);
  }
}
function se(e, r) {
  e.state.initial ? e.state.buffer.push(r) : Qr(e, r, false);
}
function Xr(e, r) {
  if (e.state.onError) e.state.onError(r);
  else throw r instanceof _ ? r : new _(r);
}
function mn(e) {
  e.state.onDone && e.state.onDone();
  for (let r = 0, t = e.state.cleanups.length; r < t; r++) e.state.cleanups[r]();
}
function Qr(e, r, t) {
  try {
    e.state.onParse(r, t);
  } catch (n) {
    Xr(e, n);
  }
}
function et(e) {
  e.state.pending++;
}
function ve(e) {
  --e.state.pending <= 0 && mn(e);
}
function K(e, r, t) {
  try {
    return E(e, r, t);
  } catch (n) {
    return Xr(e, n), o$1;
  }
}
function rt(e, r) {
  let t = K(e, 0, r);
  t && (Qr(e, t, true), e.state.initial = false, La(e, e.state), e.state.pending <= 0 && mr(e));
}
function La(e, r) {
  for (let t = 0, n = r.buffer.length; t < n; t++) Qr(e, r.buffer[t], false);
}
function mr(e) {
  e.state.alive && (mn(e), e.state.alive = false);
}
async function lu(e, r = {}) {
  let t = A(r.plugins), n = te(2, { plugins: t, disabledFeatures: r.disabledFeatures, refs: r.refs });
  return await ne(n, e);
}
function pn(e, r) {
  let t = A(r.plugins), n = Zr({ plugins: t, refs: r.refs, disabledFeatures: r.disabledFeatures, onParse(a, s) {
    let i = cr({ plugins: t, features: n.base.features, scopeId: r.scopeId, markedRefs: n.base.marked }), u;
    try {
      u = Sr(i, a);
    } catch (l2) {
      r.onError && r.onError(l2);
      return;
    }
    r.onSerialize(u, s);
  }, onError: r.onError, onDone: r.onDone });
  return rt(n, e), mr.bind(null, n);
}
function cu(e, r) {
  let t = A(r.plugins), n = Zr({ plugins: t, refs: r.refs, disabledFeatures: r.disabledFeatures, depthLimit: r.depthLimit, onParse: r.onParse, onError: r.onError, onDone: r.onDone });
  return rt(n, e), mr.bind(null, n);
}
function Ou(e, r = {}) {
  var i;
  let t = A(r.plugins), n = r.disabledFeatures || 0, a = (i = e.f) != null ? i : 63, s = jt({ plugins: t, markedRefs: e.m, features: a & ~n, disabledFeatures: n });
  return ir(s, e.t);
}
function createSerializationAdapter(opts) {
  return opts;
}
// @__NO_SIDE_EFFECTS__
function makeSsrSerovalPlugin(serializationAdapter, options) {
  return /* @__PURE__ */ ai({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: { stream(value, ctx, _data) {
      return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
    } },
    serialize(node, ctx, _data) {
      options.didRun = true;
      return GLOBAL_TSR + '.t.get("' + serializationAdapter.key + '")(' + ctx.serialize(node.v) + ")";
    },
    deserialize: void 0
  });
}
// @__NO_SIDE_EFFECTS__
function makeSerovalPlugin(serializationAdapter) {
  return /* @__PURE__ */ ai({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: {
      sync(value, ctx, _data) {
        return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
      },
      async async(value, ctx, _data) {
        return { v: await ctx.parse(serializationAdapter.toSerializable(value)) };
      },
      stream(value, ctx, _data) {
        return { v: ctx.parse(serializationAdapter.toSerializable(value)) };
      }
    },
    serialize: void 0,
    deserialize(node, ctx, _data) {
      return serializationAdapter.fromSerializable(ctx.deserialize(node.v));
    }
  });
}
var RawStream = class {
  constructor(stream, options) {
    this.stream = stream;
    this.hint = options?.hint ?? "binary";
  }
};
var BufferCtor = globalThis.Buffer;
var hasNodeBuffer = !!BufferCtor && typeof BufferCtor.from === "function";
function uint8ArrayToBase64(bytes) {
  if (bytes.length === 0) return "";
  if (hasNodeBuffer) return BufferCtor.from(bytes).toString("base64");
  const CHUNK_SIZE = 32768;
  const chunks = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, chunk));
  }
  return btoa(chunks.join(""));
}
function base64ToUint8Array(base64) {
  if (base64.length === 0) return new Uint8Array(0);
  if (hasNodeBuffer) {
    const buf = BufferCtor.from(base64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
var RAW_STREAM_FACTORY_BINARY = /* @__PURE__ */ Object.create(null);
var RAW_STREAM_FACTORY_TEXT = /* @__PURE__ */ Object.create(null);
var RAW_STREAM_FACTORY_CONSTRUCTOR_BINARY = (stream) => new ReadableStream({ start(controller) {
  stream.on({
    next(base64) {
      try {
        controller.enqueue(base64ToUint8Array(base64));
      } catch {
      }
    },
    throw(error) {
      controller.error(error);
    },
    return() {
      try {
        controller.close();
      } catch {
      }
    }
  });
} });
var textEncoderForFactory = new TextEncoder();
var RAW_STREAM_FACTORY_CONSTRUCTOR_TEXT = (stream) => {
  return new ReadableStream({ start(controller) {
    stream.on({
      next(value) {
        try {
          if (typeof value === "string") controller.enqueue(textEncoderForFactory.encode(value));
          else controller.enqueue(base64ToUint8Array(value.$b64));
        } catch {
        }
      },
      throw(error) {
        controller.error(error);
      },
      return() {
        try {
          controller.close();
        } catch {
        }
      }
    });
  } });
};
var FACTORY_BINARY = `(s=>new ReadableStream({start(c){s.on({next(b){try{const d=atob(b),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)}catch(_){}},throw(e){c.error(e)},return(){try{c.close()}catch(_){}}})}}))`;
var FACTORY_TEXT = `(s=>{const e=new TextEncoder();return new ReadableStream({start(c){s.on({next(v){try{if(typeof v==='string'){c.enqueue(e.encode(v))}else{const d=atob(v.$b64),a=new Uint8Array(d.length);for(let i=0;i<d.length;i++)a[i]=d.charCodeAt(i);c.enqueue(a)}}catch(_){}},throw(x){c.error(x)},return(){try{c.close()}catch(_){}}})}})})`;
function toBinaryStream(readable) {
  const stream = re$1();
  const reader = readable.getReader();
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          stream.return(void 0);
          break;
        }
        stream.next(uint8ArrayToBase64(value));
      }
    } catch (error) {
      stream.throw(error);
    } finally {
      reader.releaseLock();
    }
  })();
  return stream;
}
function toTextStream(readable) {
  const stream = re$1();
  const reader = readable.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          try {
            const remaining = decoder.decode();
            if (remaining.length > 0) stream.next(remaining);
          } catch {
          }
          stream.return(void 0);
          break;
        }
        try {
          const text = decoder.decode(value, { stream: true });
          if (text.length > 0) stream.next(text);
        } catch {
          stream.next({ $b64: uint8ArrayToBase64(value) });
        }
      }
    } catch (error) {
      stream.throw(error);
    } finally {
      reader.releaseLock();
    }
  })();
  return stream;
}
var RawStreamSSRPlugin = /* @__PURE__ */ ai({
  tag: "tss/RawStream",
  extends: [/* @__PURE__ */ ai({
    tag: "tss/RawStreamFactory",
    test(value) {
      return value === RAW_STREAM_FACTORY_BINARY;
    },
    parse: {
      sync(_value, _ctx, _data) {
        return {};
      },
      async async(_value, _ctx, _data) {
        return {};
      },
      stream(_value, _ctx, _data) {
        return {};
      }
    },
    serialize(_node, _ctx, _data) {
      return FACTORY_BINARY;
    },
    deserialize(_node, _ctx, _data) {
      return RAW_STREAM_FACTORY_BINARY;
    }
  }), /* @__PURE__ */ ai({
    tag: "tss/RawStreamFactoryText",
    test(value) {
      return value === RAW_STREAM_FACTORY_TEXT;
    },
    parse: {
      sync(_value, _ctx, _data) {
        return {};
      },
      async async(_value, _ctx, _data) {
        return {};
      },
      stream(_value, _ctx, _data) {
        return {};
      }
    },
    serialize(_node, _ctx, _data) {
      return FACTORY_TEXT;
    },
    deserialize(_node, _ctx, _data) {
      return RAW_STREAM_FACTORY_TEXT;
    }
  })],
  test(value) {
    return value instanceof RawStream;
  },
  parse: {
    sync(value, ctx, _data) {
      const factory = value.hint === "text" ? RAW_STREAM_FACTORY_TEXT : RAW_STREAM_FACTORY_BINARY;
      return {
        hint: ctx.parse(value.hint),
        factory: ctx.parse(factory),
        stream: ctx.parse(re$1())
      };
    },
    async async(value, ctx, _data) {
      const factory = value.hint === "text" ? RAW_STREAM_FACTORY_TEXT : RAW_STREAM_FACTORY_BINARY;
      const encodedStream = value.hint === "text" ? toTextStream(value.stream) : toBinaryStream(value.stream);
      return {
        hint: await ctx.parse(value.hint),
        factory: await ctx.parse(factory),
        stream: await ctx.parse(encodedStream)
      };
    },
    stream(value, ctx, _data) {
      const factory = value.hint === "text" ? RAW_STREAM_FACTORY_TEXT : RAW_STREAM_FACTORY_BINARY;
      const encodedStream = value.hint === "text" ? toTextStream(value.stream) : toBinaryStream(value.stream);
      return {
        hint: ctx.parse(value.hint),
        factory: ctx.parse(factory),
        stream: ctx.parse(encodedStream)
      };
    }
  },
  serialize(node, ctx, _data) {
    return "(" + ctx.serialize(node.factory) + ")(" + ctx.serialize(node.stream) + ")";
  },
  deserialize(node, ctx, _data) {
    const stream = ctx.deserialize(node.stream);
    return ctx.deserialize(node.hint) === "text" ? RAW_STREAM_FACTORY_CONSTRUCTOR_TEXT(stream) : RAW_STREAM_FACTORY_CONSTRUCTOR_BINARY(stream);
  }
});
// @__NO_SIDE_EFFECTS__
function createRawStreamRPCPlugin(onRawStream) {
  let nextStreamId = 1;
  return /* @__PURE__ */ ai({
    tag: "tss/RawStream",
    test(value) {
      return value instanceof RawStream;
    },
    parse: {
      async async(value, ctx, _data) {
        const streamId = nextStreamId++;
        onRawStream(streamId, value.stream);
        return { streamId: await ctx.parse(streamId) };
      },
      stream(value, ctx, _data) {
        const streamId = nextStreamId++;
        onRawStream(streamId, value.stream);
        return { streamId: ctx.parse(streamId) };
      }
    },
    serialize() {
      throw new Error("RawStreamRPCPlugin.serialize should not be called. RPC uses JSON serialization, not JS code generation.");
    },
    deserialize() {
      throw new Error("RawStreamRPCPlugin.deserialize should not be called. Use createRawStreamDeserializePlugin on client.");
    }
  });
}
var ShallowErrorPlugin = /* @__PURE__ */ ai({
  tag: "$TSR/Error",
  test(value) {
    return value instanceof Error;
  },
  parse: {
    sync(value, ctx) {
      return { message: ctx.parse(value.message) };
    },
    async async(value, ctx) {
      return { message: await ctx.parse(value.message) };
    },
    stream(value, ctx) {
      return { message: ctx.parse(value.message) };
    }
  },
  serialize(node, ctx) {
    return "new Error(" + ctx.serialize(node.message) + ")";
  },
  deserialize(node, ctx) {
    return new Error(ctx.deserialize(node.message));
  }
});
var o = {}, P = (e) => new ReadableStream({ start: (r) => {
  e.on({ next: (a) => {
    try {
      r.enqueue(a);
    } catch (t) {
    }
  }, throw: (a) => {
    r.error(a);
  }, return: () => {
    try {
      r.close();
    } catch (a) {
    }
  } });
} }), ee = ai({ tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === o;
}, parse: { sync() {
  return o;
}, async async() {
  return await Promise.resolve(o);
}, stream() {
  return o;
} }, serialize() {
  return P.toString();
}, deserialize() {
  return o;
} });
async function N(e, r) {
  try {
    let a = await r.read();
    a.done ? (e.return(a.value), r.releaseLock()) : (e.next(a.value), await N(e, r));
  } catch (a) {
    e.throw(a);
  }
}
function re(e) {
  e.cancel().catch(() => {
  }), e.releaseLock();
}
function w(e) {
  let r = re$1(), a = e.getReader(), t = re.bind(null, a);
  return N(r, a).catch(t), [r, t];
}
var ae = ai({ tag: "seroval/plugins/web/ReadableStream", extends: [ee], test(e) {
  return typeof ReadableStream == "undefined" ? false : e instanceof ReadableStream;
}, parse: { sync(e, r) {
  return { factory: r.parse(o), stream: r.parse(re$1()) };
}, async async(e, r) {
  return { factory: await r.parse(o), stream: await r.parse(w(e)[0]) };
}, stream(e, r) {
  let [a, t] = w(e);
  return r.addCleanup(t), { factory: r.parse(o), stream: r.parse(a) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.stream) + ")";
}, deserialize(e, r) {
  let a = r.deserialize(e.stream);
  return P(a);
} }), l = ae;
var defaultSerovalPlugins = [
  ShallowErrorPlugin,
  RawStreamSSRPlugin,
  l
];
async function getStartManifest(matchedRoutes) {
  const { tsrStartManifest } = await import("./assets/_tanstack-start-manifest_v-DY2KqF2N.js");
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId] = startManifest.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  let injectedHeadScripts;
  return {
    manifest: { routes: Object.fromEntries(Object.entries(startManifest.routes).flatMap(([k2, v2]) => {
      const result = {};
      let hasData = false;
      if (v2.preloads && v2.preloads.length > 0) {
        result["preloads"] = v2.preloads;
        hasData = true;
      }
      if (v2.assets && v2.assets.length > 0) {
        result["assets"] = v2.assets;
        hasData = true;
      }
      if (!hasData) return [];
      return [[k2, result]];
    })) },
    clientEntry: startManifest.clientEntry,
    injectedHeadScripts
  };
}
const manifest = {
  "49106938b52c8bf2e7795ac418917757130e43844a341613882f98c174227919": {
    functionName: "getServerUser_createServerFn_handler",
    importer: () => import("./assets/auth-EgeJU_eG.js")
  }
};
async function getServerFnById(id, access) {
  const serverFnInfo = manifest[id];
  if (!serverFnInfo) {
    throw new Error("Server function info not found for " + id);
  }
  const fnModule = serverFnInfo.module ?? await serverFnInfo.importer();
  if (!fnModule) {
    throw new Error("Server function module not resolved for " + id);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    throw new Error("Server function module export not resolved for serverFn ID: " + id);
  }
  return action;
}
var TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
var TSS_SERVER_FUNCTION = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION");
var TSS_SERVER_FUNCTION_FACTORY = /* @__PURE__ */ Symbol.for("TSS_SERVER_FUNCTION_FACTORY");
var X_TSS_SERIALIZED = "x-tss-serialized";
var X_TSS_RAW_RESPONSE = "x-tss-raw";
var TSS_CONTENT_TYPE_FRAMED = "application/x-tss-framed";
var FrameType = {
  JSON: 0,
  CHUNK: 1,
  END: 2,
  ERROR: 3
};
var FRAME_HEADER_SIZE = 9;
var TSS_CONTENT_TYPE_FRAMED_VERSIONED = `${TSS_CONTENT_TYPE_FRAMED}; v=1`;
function isSafeKey(key) {
  return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}
function safeObjectMerge(target, source) {
  const result = /* @__PURE__ */ Object.create(null);
  if (target) {
    for (const key of Object.keys(target)) if (isSafeKey(key)) result[key] = target[key];
  }
  if (source && typeof source === "object") {
    for (const key of Object.keys(source)) if (isSafeKey(key)) result[key] = source[key];
  }
  return result;
}
function createNullProtoObject(source) {
  if (!source) return /* @__PURE__ */ Object.create(null);
  const obj = /* @__PURE__ */ Object.create(null);
  for (const key of Object.keys(source)) if (isSafeKey(key)) obj[key] = source[key];
  return obj;
}
var GLOBAL_STORAGE_KEY = /* @__PURE__ */ Symbol.for("tanstack-start:start-storage-context");
var globalObj = globalThis;
if (!globalObj[GLOBAL_STORAGE_KEY]) globalObj[GLOBAL_STORAGE_KEY] = new AsyncLocalStorage();
var startStorage = globalObj[GLOBAL_STORAGE_KEY];
async function runWithStartContext(context, fn2) {
  return startStorage.run(context, fn2);
}
function getStartContext(opts) {
  const context = startStorage.getStore();
  if (!context && opts?.throwIfNotFound !== false) throw new Error(`No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`);
  return context;
}
var getStartOptions = () => getStartContext().startOptions;
var getStartContextServerOnly = getStartContext;
function splitSetCookieString(cookiesString) {
  if (Array.isArray(cookiesString)) return cookiesString.flatMap((c2) => splitSetCookieString(c2));
  if (typeof cookiesString !== "string") return [];
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) pos += 1;
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else pos = lastComma + 1;
      } else pos += 1;
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
  }
  return cookiesStrings;
}
function toHeadersInstance(init) {
  if (init instanceof Headers) return init;
  else if (Array.isArray(init)) return new Headers(init);
  else if (typeof init === "object") return new Headers(init);
  else return null;
}
function mergeHeaders(...headers) {
  return headers.reduce((acc, header) => {
    const headersInstance = toHeadersInstance(header);
    if (!headersInstance) return acc;
    for (const [key, value] of headersInstance.entries()) if (key === "set-cookie") splitSetCookieString(value).forEach((cookie) => acc.append("set-cookie", cookie));
    else acc.set(key, value);
    return acc;
  }, new Headers());
}
function dehydrateSsrMatchId(id) {
  return id.replaceAll("/", "\0");
}
var createServerFn = (options, __opts) => {
  const resolvedOptions = __opts || options || {};
  if (typeof resolvedOptions.method === "undefined") resolvedOptions.method = "GET";
  const res = {
    options: resolvedOptions,
    middleware: (middleware) => {
      const newMiddleware = [...resolvedOptions.middleware || []];
      middleware.map((m2) => {
        if (TSS_SERVER_FUNCTION_FACTORY in m2) {
          if (m2.options.middleware) newMiddleware.push(...m2.options.middleware);
        } else newMiddleware.push(m2);
      });
      const res2 = createServerFn(void 0, {
        ...resolvedOptions,
        middleware: newMiddleware
      });
      res2[TSS_SERVER_FUNCTION_FACTORY] = true;
      return res2;
    },
    inputValidator: (inputValidator) => {
      return createServerFn(void 0, {
        ...resolvedOptions,
        inputValidator
      });
    },
    handler: (...args) => {
      const [extractedFn, serverFn] = args;
      const newOptions = {
        ...resolvedOptions,
        extractedFn,
        serverFn
      };
      const resolvedMiddleware = [...newOptions.middleware || [], serverFnBaseToMiddleware(newOptions)];
      extractedFn.method = resolvedOptions.method;
      return Object.assign(async (opts) => {
        const result = await executeMiddleware$1(resolvedMiddleware, "client", {
          ...extractedFn,
          ...newOptions,
          data: opts?.data,
          headers: opts?.headers,
          signal: opts?.signal,
          fetch: opts?.fetch,
          context: createNullProtoObject()
        });
        const redirect2 = parseRedirect(result.error);
        if (redirect2) throw redirect2;
        if (result.error) throw result.error;
        return result.result;
      }, {
        ...extractedFn,
        method: resolvedOptions.method,
        __executeServer: async (opts) => {
          const startContext = getStartContextServerOnly();
          const serverContextAfterGlobalMiddlewares = startContext.contextAfterGlobalMiddlewares;
          return await executeMiddleware$1(resolvedMiddleware, "server", {
            ...extractedFn,
            ...opts,
            serverFnMeta: extractedFn.serverFnMeta,
            context: safeObjectMerge(opts.context, serverContextAfterGlobalMiddlewares),
            request: startContext.request
          }).then((d) => ({
            result: d.result,
            error: d.error,
            context: d.sendContext
          }));
        }
      });
    }
  };
  const fun = (options2) => {
    return createServerFn(void 0, {
      ...resolvedOptions,
      ...options2
    });
  };
  return Object.assign(fun, res);
};
async function executeMiddleware$1(middlewares, env, opts) {
  let flattenedMiddlewares = flattenMiddlewares([...getStartOptions()?.functionMiddleware || [], ...middlewares]);
  if (env === "server") {
    const startContext = getStartContextServerOnly({ throwIfNotFound: false });
    if (startContext?.executedRequestMiddlewares) flattenedMiddlewares = flattenedMiddlewares.filter((m2) => !startContext.executedRequestMiddlewares.has(m2));
  }
  const callNextMiddleware = async (ctx) => {
    const nextMiddleware = flattenedMiddlewares.shift();
    if (!nextMiddleware) return ctx;
    try {
      if ("inputValidator" in nextMiddleware.options && nextMiddleware.options.inputValidator && env === "server") ctx.data = await execValidator(nextMiddleware.options.inputValidator, ctx.data);
      let middlewareFn = void 0;
      if (env === "client") {
        if ("client" in nextMiddleware.options) middlewareFn = nextMiddleware.options.client;
      } else if ("server" in nextMiddleware.options) middlewareFn = nextMiddleware.options.server;
      if (middlewareFn) {
        const userNext = async (userCtx = {}) => {
          const result2 = await callNextMiddleware({
            ...ctx,
            ...userCtx,
            context: safeObjectMerge(ctx.context, userCtx.context),
            sendContext: safeObjectMerge(ctx.sendContext, userCtx.sendContext),
            headers: mergeHeaders(ctx.headers, userCtx.headers),
            _callSiteFetch: ctx._callSiteFetch,
            fetch: ctx._callSiteFetch ?? userCtx.fetch ?? ctx.fetch,
            result: userCtx.result !== void 0 ? userCtx.result : userCtx instanceof Response ? userCtx : ctx.result,
            error: userCtx.error ?? ctx.error
          });
          if (result2.error) throw result2.error;
          return result2;
        };
        const result = await middlewareFn({
          ...ctx,
          next: userNext
        });
        if (isRedirect(result)) return {
          ...ctx,
          error: result
        };
        if (result instanceof Response) return {
          ...ctx,
          result
        };
        if (!result) throw new Error("User middleware returned undefined. You must call next() or return a result in your middlewares.");
        return result;
      }
      return callNextMiddleware(ctx);
    } catch (error) {
      return {
        ...ctx,
        error
      };
    }
  };
  return callNextMiddleware({
    ...opts,
    headers: opts.headers || {},
    sendContext: opts.sendContext || {},
    context: opts.context || createNullProtoObject(),
    _callSiteFetch: opts.fetch
  });
}
function flattenMiddlewares(middlewares, maxDepth = 100) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware, depth) => {
    if (depth > maxDepth) throw new Error(`Middleware nesting depth exceeded maximum of ${maxDepth}. Check for circular references.`);
    middleware.forEach((m2) => {
      if (m2.options.middleware) recurse(m2.options.middleware, depth + 1);
      if (!seen.has(m2)) {
        seen.add(m2);
        flattened.push(m2);
      }
    });
  };
  recurse(middlewares, 0);
  return flattened;
}
async function execValidator(validator, input) {
  if (validator == null) return {};
  if ("~standard" in validator) {
    const result = await validator["~standard"].validate(input);
    if (result.issues) throw new Error(JSON.stringify(result.issues, void 0, 2));
    return result.value;
  }
  if ("parse" in validator) return validator.parse(input);
  if (typeof validator === "function") return validator(input);
  throw new Error("Invalid validator type!");
}
function serverFnBaseToMiddleware(options) {
  return {
    "~types": void 0,
    options: {
      inputValidator: options.inputValidator,
      client: async ({ next, sendContext, fetch, ...ctx }) => {
        const payload = {
          ...ctx,
          context: sendContext,
          fetch
        };
        return next(await options.extractedFn?.(payload));
      },
      server: async ({ next, ...ctx }) => {
        const result = await options.serverFn?.(ctx);
        return next({
          ...ctx,
          result
        });
      }
    }
  };
}
function getDefaultSerovalPlugins() {
  return [...getStartOptions()?.serializationAdapters?.map(makeSerovalPlugin) ?? [], ...defaultSerovalPlugins];
}
var textEncoder = new TextEncoder();
var EMPTY_PAYLOAD = new Uint8Array(0);
function encodeFrame(type, streamId, payload) {
  const frame = new Uint8Array(FRAME_HEADER_SIZE + payload.length);
  frame[0] = type;
  frame[1] = streamId >>> 24 & 255;
  frame[2] = streamId >>> 16 & 255;
  frame[3] = streamId >>> 8 & 255;
  frame[4] = streamId & 255;
  frame[5] = payload.length >>> 24 & 255;
  frame[6] = payload.length >>> 16 & 255;
  frame[7] = payload.length >>> 8 & 255;
  frame[8] = payload.length & 255;
  frame.set(payload, FRAME_HEADER_SIZE);
  return frame;
}
function encodeJSONFrame(json) {
  return encodeFrame(FrameType.JSON, 0, textEncoder.encode(json));
}
function encodeChunkFrame(streamId, chunk) {
  return encodeFrame(FrameType.CHUNK, streamId, chunk);
}
function encodeEndFrame(streamId) {
  return encodeFrame(FrameType.END, streamId, EMPTY_PAYLOAD);
}
function encodeErrorFrame(streamId, error) {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return encodeFrame(FrameType.ERROR, streamId, textEncoder.encode(message));
}
function createMultiplexedStream(jsonStream, rawStreams, lateStreamSource) {
  let controller;
  let cancelled = false;
  const readers = [];
  const enqueue = (frame) => {
    if (cancelled) return false;
    try {
      controller.enqueue(frame);
      return true;
    } catch {
      return false;
    }
  };
  const errorOutput = (error) => {
    if (cancelled) return;
    cancelled = true;
    try {
      controller.error(error);
    } catch {
    }
    for (const reader of readers) reader.cancel().catch(() => {
    });
  };
  async function pumpRawStream(streamId, stream) {
    const reader = stream.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) {
          enqueue(encodeEndFrame(streamId));
          return;
        }
        if (!enqueue(encodeChunkFrame(streamId, value))) return;
      }
    } catch (error) {
      enqueue(encodeErrorFrame(streamId, error));
    } finally {
      reader.releaseLock();
    }
  }
  async function pumpJSON() {
    const reader = jsonStream.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) return;
        if (!enqueue(encodeJSONFrame(value))) return;
      }
    } catch (error) {
      errorOutput(error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  async function pumpLateStreams() {
    if (!lateStreamSource) return [];
    const lateStreamPumps = [];
    const reader = lateStreamSource.getReader();
    readers.push(reader);
    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        lateStreamPumps.push(pumpRawStream(value.id, value.stream));
      }
    } finally {
      reader.releaseLock();
    }
    return lateStreamPumps;
  }
  return new ReadableStream({
    async start(ctrl) {
      controller = ctrl;
      const pumps = [pumpJSON()];
      for (const [streamId, stream] of rawStreams) pumps.push(pumpRawStream(streamId, stream));
      if (lateStreamSource) pumps.push(pumpLateStreams());
      try {
        const latePumps = (await Promise.all(pumps)).find(Array.isArray);
        if (latePumps && latePumps.length > 0) await Promise.all(latePumps);
        if (!cancelled) try {
          controller.close();
        } catch {
        }
      } catch {
      }
    },
    cancel() {
      cancelled = true;
      for (const reader of readers) reader.cancel().catch(() => {
      });
      readers.length = 0;
    }
  });
}
var serovalPlugins = void 0;
var FORM_DATA_CONTENT_TYPES = ["multipart/form-data", "application/x-www-form-urlencoded"];
var MAX_PAYLOAD_SIZE = 1e6;
var handleServerAction = async ({ request, context, serverFnId }) => {
  const methodUpper = request.method.toUpperCase();
  const url = new URL(request.url);
  const action = await getServerFnById(serverFnId);
  if (action.method && methodUpper !== action.method) return new Response(`expected ${action.method} method. Got ${methodUpper}`, {
    status: 405,
    headers: { Allow: action.method }
  });
  const isServerFn = request.headers.get("x-tsr-serverFn") === "true";
  if (!serovalPlugins) serovalPlugins = getDefaultSerovalPlugins();
  const contentType = request.headers.get("Content-Type");
  function parsePayload(payload) {
    return Ou(payload, { plugins: serovalPlugins });
  }
  return await (async () => {
    try {
      let serializeResult = function(res2) {
        let nonStreamingBody = void 0;
        const alsResponse = getResponse();
        if (res2 !== void 0) {
          const rawStreams = /* @__PURE__ */ new Map();
          let initialPhase = true;
          let lateStreamWriter;
          let lateStreamReadable = void 0;
          const pendingLateStreams = [];
          const plugins = [/* @__PURE__ */ createRawStreamRPCPlugin((id, stream) => {
            if (initialPhase) {
              rawStreams.set(id, stream);
              return;
            }
            if (lateStreamWriter) {
              lateStreamWriter.write({
                id,
                stream
              }).catch(() => {
              });
              return;
            }
            pendingLateStreams.push({
              id,
              stream
            });
          }), ...serovalPlugins || []];
          let done = false;
          const callbacks = {
            onParse: (value) => {
              nonStreamingBody = value;
            },
            onDone: () => {
              done = true;
            },
            onError: (error) => {
              throw error;
            }
          };
          cu(res2, {
            refs: /* @__PURE__ */ new Map(),
            plugins,
            onParse(value) {
              callbacks.onParse(value);
            },
            onDone() {
              callbacks.onDone();
            },
            onError: (error) => {
              callbacks.onError(error);
            }
          });
          initialPhase = false;
          if (done && rawStreams.size === 0) return new Response(nonStreamingBody ? JSON.stringify(nonStreamingBody) : void 0, {
            status: alsResponse.status,
            statusText: alsResponse.statusText,
            headers: {
              "Content-Type": "application/json",
              [X_TSS_SERIALIZED]: "true"
            }
          });
          const { readable, writable } = new TransformStream();
          lateStreamReadable = readable;
          lateStreamWriter = writable.getWriter();
          for (const registration of pendingLateStreams) lateStreamWriter.write(registration).catch(() => {
          });
          pendingLateStreams.length = 0;
          const multiplexedStream = createMultiplexedStream(new ReadableStream({
            start(controller) {
              callbacks.onParse = (value) => {
                controller.enqueue(JSON.stringify(value) + "\n");
              };
              callbacks.onDone = () => {
                try {
                  controller.close();
                } catch {
                }
                lateStreamWriter?.close().catch(() => {
                }).finally(() => {
                  lateStreamWriter = void 0;
                });
              };
              callbacks.onError = (error) => {
                controller.error(error);
                lateStreamWriter?.abort(error).catch(() => {
                }).finally(() => {
                  lateStreamWriter = void 0;
                });
              };
              if (nonStreamingBody !== void 0) callbacks.onParse(nonStreamingBody);
              if (done) callbacks.onDone();
            },
            cancel() {
              lateStreamWriter?.abort().catch(() => {
              });
              lateStreamWriter = void 0;
            }
          }), rawStreams, lateStreamReadable);
          return new Response(multiplexedStream, {
            status: alsResponse.status,
            statusText: alsResponse.statusText,
            headers: {
              "Content-Type": TSS_CONTENT_TYPE_FRAMED_VERSIONED,
              [X_TSS_SERIALIZED]: "true"
            }
          });
        }
        return new Response(void 0, {
          status: alsResponse.status,
          statusText: alsResponse.statusText
        });
      };
      let res = await (async () => {
        if (FORM_DATA_CONTENT_TYPES.some((type) => contentType && contentType.includes(type))) {
          if (methodUpper === "GET") {
            if (false) ;
            invariant();
          }
          const formData = await request.formData();
          const serializedContext = formData.get(TSS_FORMDATA_CONTEXT);
          formData.delete(TSS_FORMDATA_CONTEXT);
          const params = {
            context,
            data: formData,
            method: methodUpper
          };
          if (typeof serializedContext === "string") try {
            const deserializedContext = Ou(JSON.parse(serializedContext), { plugins: serovalPlugins });
            if (typeof deserializedContext === "object" && deserializedContext) params.context = safeObjectMerge(deserializedContext, context);
          } catch (e) {
            if (false) ;
          }
          return await action(params);
        }
        if (methodUpper === "GET") {
          const payloadParam = url.searchParams.get("payload");
          if (payloadParam && payloadParam.length > MAX_PAYLOAD_SIZE) throw new Error("Payload too large");
          const payload2 = payloadParam ? parsePayload(JSON.parse(payloadParam)) : {};
          payload2.context = safeObjectMerge(payload2.context, context);
          payload2.method = methodUpper;
          return await action(payload2);
        }
        let jsonPayload;
        if (contentType?.includes("application/json")) jsonPayload = await request.json();
        const payload = jsonPayload ? parsePayload(jsonPayload) : {};
        payload.context = safeObjectMerge(payload.context, context);
        payload.method = methodUpper;
        return await action(payload);
      })();
      const unwrapped = res.result || res.error;
      if (isNotFound(res)) res = isNotFoundResponse(res);
      if (!isServerFn) return unwrapped;
      if (unwrapped instanceof Response) {
        if (isRedirect(unwrapped)) return unwrapped;
        unwrapped.headers.set(X_TSS_RAW_RESPONSE, "true");
        return unwrapped;
      }
      return serializeResult(res);
    } catch (error) {
      if (error instanceof Response) return error;
      if (isNotFound(error)) return isNotFoundResponse(error);
      console.info();
      console.info("Server Fn Error!");
      console.info();
      console.error(error);
      console.info();
      const serializedError = JSON.stringify(await Promise.resolve(lu(error, {
        refs: /* @__PURE__ */ new Map(),
        plugins: serovalPlugins
      })));
      const response = getResponse();
      return new Response(serializedError, {
        status: response.status ?? 500,
        statusText: response.statusText,
        headers: {
          "Content-Type": "application/json",
          [X_TSS_SERIALIZED]: "true"
        }
      });
    }
  })();
};
function isNotFoundResponse(error) {
  const { headers, ...rest } = error;
  return new Response(JSON.stringify(rest), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      ...headers || {}
    }
  });
}
function normalizeTransformAssetResult(result) {
  if (typeof result === "string") return { href: result };
  return result;
}
function resolveTransformAssetsCrossOrigin(config, kind) {
  if (!config) return void 0;
  if (typeof config === "string") return config;
  return config[kind];
}
function isObjectShorthand(transform) {
  return "prefix" in transform;
}
function resolveTransformAssetsConfig(transform) {
  if (typeof transform === "string") {
    const prefix = transform;
    return {
      type: "transform",
      transformFn: ({ url }) => ({ href: `${prefix}${url}` }),
      cache: true
    };
  }
  if (typeof transform === "function") return {
    type: "transform",
    transformFn: transform,
    cache: true
  };
  if (isObjectShorthand(transform)) {
    const { prefix, crossOrigin } = transform;
    return {
      type: "transform",
      transformFn: ({ url, kind }) => {
        const href = `${prefix}${url}`;
        if (kind === "clientEntry") return { href };
        const co2 = resolveTransformAssetsCrossOrigin(crossOrigin, kind);
        return co2 ? {
          href,
          crossOrigin: co2
        } : { href };
      },
      cache: true
    };
  }
  if ("createTransform" in transform && transform.createTransform) return {
    type: "createTransform",
    createTransform: transform.createTransform,
    cache: transform.cache !== false
  };
  return {
    type: "transform",
    transformFn: typeof transform.transform === "string" ? (({ url }) => ({ href: `${transform.transform}${url}` })) : transform.transform,
    cache: transform.cache !== false
  };
}
function adaptTransformAssetUrlsToTransformAssets(transformFn) {
  return async ({ url, kind }) => ({ href: await transformFn({
    url,
    type: kind
  }) });
}
function adaptTransformAssetUrlsConfigToTransformAssets(transform) {
  if (typeof transform === "string") return transform;
  if (typeof transform === "function") return adaptTransformAssetUrlsToTransformAssets(transform);
  if ("createTransform" in transform && transform.createTransform) return {
    createTransform: async (ctx) => adaptTransformAssetUrlsToTransformAssets(await transform.createTransform(ctx)),
    cache: transform.cache,
    warmup: transform.warmup
  };
  return {
    transform: typeof transform.transform === "string" ? transform.transform : adaptTransformAssetUrlsToTransformAssets(transform.transform),
    cache: transform.cache,
    warmup: transform.warmup
  };
}
function buildClientEntryScriptTag(clientEntry, injectedHeadScripts) {
  let script = `import(${JSON.stringify(clientEntry)})`;
  if (injectedHeadScripts) script = `${injectedHeadScripts};${script}`;
  return {
    tag: "script",
    attrs: {
      type: "module",
      async: true
    },
    children: script
  };
}
function assignManifestAssetLink(link, next) {
  if (typeof link === "string") return next.crossOrigin ? next : next.href;
  return next.crossOrigin ? next : { href: next.href };
}
async function transformManifestAssets(source, transformFn, _opts) {
  const manifest2 = structuredClone(source.manifest);
  for (const route of Object.values(manifest2.routes)) {
    if (route.preloads) route.preloads = await Promise.all(route.preloads.map(async (link) => {
      const result = normalizeTransformAssetResult(await transformFn({
        url: resolveManifestAssetLink(link).href,
        kind: "modulepreload"
      }));
      return assignManifestAssetLink(link, {
        href: result.href,
        crossOrigin: result.crossOrigin
      });
    }));
    if (route.assets) {
      for (const asset of route.assets) if (asset.tag === "link" && asset.attrs?.href) {
        const rel = asset.attrs.rel;
        if (!(typeof rel === "string" ? rel.split(/\s+/) : []).includes("stylesheet")) continue;
        const result = normalizeTransformAssetResult(await transformFn({
          url: asset.attrs.href,
          kind: "stylesheet"
        }));
        asset.attrs.href = result.href;
        if (result.crossOrigin) asset.attrs.crossOrigin = result.crossOrigin;
        else delete asset.attrs.crossOrigin;
      }
    }
  }
  const transformedClientEntry = normalizeTransformAssetResult(await transformFn({
    url: source.clientEntry,
    kind: "clientEntry"
  }));
  const rootRoute = manifest2.routes[rootRouteId] = manifest2.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  rootRoute.assets.push(buildClientEntryScriptTag(transformedClientEntry.href, source.injectedHeadScripts));
  return manifest2;
}
function buildManifestWithClientEntry(source) {
  const scriptTag = buildClientEntryScriptTag(source.clientEntry, source.injectedHeadScripts);
  const baseRootRoute = source.manifest.routes[rootRouteId];
  return { routes: {
    ...source.manifest.routes,
    [rootRouteId]: {
      ...baseRootRoute,
      assets: [...baseRootRoute?.assets || [], scriptTag]
    }
  } };
}
var ServerFunctionSerializationAdapter = createSerializationAdapter({
  key: "$TSS/serverfn",
  test: (v2) => {
    if (typeof v2 !== "function") return false;
    if (!(TSS_SERVER_FUNCTION in v2)) return false;
    return !!v2[TSS_SERVER_FUNCTION];
  },
  toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
  fromSerializable: ({ functionId }) => {
    const fn2 = async (opts, signal) => {
      return (await (await getServerFnById(functionId))(opts ?? {}, signal)).result;
    };
    return fn2;
  }
});
var tsrScript_default = "self.$_TSR={h(){this.hydrated=!0,this.c()},e(){this.streamEnded=!0,this.c()},c(){this.hydrated&&this.streamEnded&&(delete self.$_TSR,delete self.$R.tsr)},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]}";
var SCOPE_ID = "tsr";
var TSR_PREFIX = GLOBAL_TSR + ".router=";
var P_PREFIX = GLOBAL_TSR + ".p(()=>";
var P_SUFFIX = ")";
function dehydrateMatch(match) {
  const dehydratedMatch = {
    i: dehydrateSsrMatchId(match.id),
    u: match.updatedAt,
    s: match.status
  };
  for (const [key, shorthand] of [
    ["__beforeLoadContext", "b"],
    ["loaderData", "l"],
    ["error", "e"],
    ["ssr", "ssr"]
  ]) if (match[key] !== void 0) dehydratedMatch[shorthand] = match[key];
  if (match.globalNotFound) dehydratedMatch.g = true;
  return dehydratedMatch;
}
var INITIAL_SCRIPTS = [yn(SCOPE_ID), tsrScript_default];
var ScriptBuffer = class {
  constructor(router) {
    this._scriptBarrierLifted = false;
    this._cleanedUp = false;
    this._pendingMicrotask = false;
    this.router = router;
    this._queue = INITIAL_SCRIPTS.slice();
  }
  enqueue(script) {
    if (this._cleanedUp) return;
    this._queue.push(script);
    if (this._scriptBarrierLifted && !this._pendingMicrotask) {
      this._pendingMicrotask = true;
      queueMicrotask(() => {
        this._pendingMicrotask = false;
        this.injectBufferedScripts();
      });
    }
  }
  liftBarrier() {
    if (this._scriptBarrierLifted || this._cleanedUp) return;
    this._scriptBarrierLifted = true;
    if (this._queue.length > 0 && !this._pendingMicrotask) {
      this._pendingMicrotask = true;
      queueMicrotask(() => {
        this._pendingMicrotask = false;
        this.injectBufferedScripts();
      });
    }
  }
  /**
  * Flushes any pending scripts synchronously.
  * Call this before emitting onSerializationFinished to ensure all scripts are injected.
  *
  * IMPORTANT: Only injects if the barrier has been lifted. Before the barrier is lifted,
  * scripts should remain in the queue so takeBufferedScripts() can retrieve them
  */
  flush() {
    if (!this._scriptBarrierLifted) return;
    if (this._cleanedUp) return;
    this._pendingMicrotask = false;
    const scriptsToInject = this.takeAll();
    if (scriptsToInject && this.router?.serverSsr) this.router.serverSsr.injectScript(scriptsToInject);
  }
  takeAll() {
    const bufferedScripts = this._queue;
    this._queue = [];
    if (bufferedScripts.length === 0) return;
    if (bufferedScripts.length === 1) return bufferedScripts[0] + ";document.currentScript.remove()";
    return bufferedScripts.join(";") + ";document.currentScript.remove()";
  }
  injectBufferedScripts() {
    if (this._cleanedUp) return;
    if (this._queue.length === 0) return;
    const scriptsToInject = this.takeAll();
    if (scriptsToInject && this.router?.serverSsr) this.router.serverSsr.injectScript(scriptsToInject);
  }
  cleanup() {
    this._cleanedUp = true;
    this._queue = [];
    this.router = void 0;
  }
};
var MANIFEST_CACHE_SIZE = 100;
var manifestCaches = /* @__PURE__ */ new WeakMap();
function getManifestCache(manifest2) {
  const cache = manifestCaches.get(manifest2);
  if (cache) return cache;
  const newCache = createLRUCache(MANIFEST_CACHE_SIZE);
  manifestCaches.set(manifest2, newCache);
  return newCache;
}
function attachRouterServerSsrUtils({ router, manifest: manifest2, getRequestAssets, includeUnmatchedRouteAssets = true }) {
  router.ssr = { get manifest() {
    const requestAssets = getRequestAssets?.();
    if (!requestAssets?.length) return manifest2;
    return {
      ...manifest2,
      routes: {
        ...manifest2?.routes,
        [rootRouteId]: {
          ...manifest2?.routes?.[rootRouteId],
          assets: [...requestAssets, ...manifest2?.routes?.["__root__"]?.assets ?? []]
        }
      }
    };
  } };
  let _dehydrated = false;
  let _serializationFinished = false;
  const renderFinishedListeners = [];
  const serializationFinishedListeners = [];
  const scriptBuffer = new ScriptBuffer(router);
  let injectedHtmlBuffer = "";
  router.serverSsr = {
    injectHtml: (html) => {
      if (!html) return;
      injectedHtmlBuffer += html;
      router.emit({ type: "onInjectedHtml" });
    },
    injectScript: (script) => {
      if (!script) return;
      const html = `<script${router.options.ssr?.nonce ? ` nonce='${router.options.ssr.nonce}'` : ""}>${script}<\/script>`;
      router.serverSsr.injectHtml(html);
    },
    dehydrate: async (opts) => {
      if (_dehydrated) {
        invariant();
      }
      let matchesToDehydrate = router.stores.matches.get();
      if (router.isShell()) matchesToDehydrate = matchesToDehydrate.slice(0, 1);
      const matches = matchesToDehydrate.map(dehydrateMatch);
      let manifestToDehydrate = void 0;
      if (manifest2) {
        const currentRouteIdsList = matchesToDehydrate.map((m2) => m2.routeId);
        const manifestCacheKey = `${currentRouteIdsList.join("\0")}\0includeUnmatchedRouteAssets=${includeUnmatchedRouteAssets}`;
        let filteredRoutes;
        filteredRoutes = getManifestCache(manifest2).get(manifestCacheKey);
        if (!filteredRoutes) {
          const currentRouteIds = new Set(currentRouteIdsList);
          const nextFilteredRoutes = {};
          for (const routeId in manifest2.routes) {
            const routeManifest = manifest2.routes[routeId];
            if (currentRouteIds.has(routeId)) nextFilteredRoutes[routeId] = routeManifest;
            else if (includeUnmatchedRouteAssets && routeManifest.assets && routeManifest.assets.length > 0) nextFilteredRoutes[routeId] = { assets: routeManifest.assets };
          }
          getManifestCache(manifest2).set(manifestCacheKey, nextFilteredRoutes);
          filteredRoutes = nextFilteredRoutes;
        }
        manifestToDehydrate = { routes: filteredRoutes };
        if (opts?.requestAssets?.length) {
          const existingRoot = manifestToDehydrate.routes[rootRouteId];
          manifestToDehydrate.routes[rootRouteId] = {
            ...existingRoot,
            assets: [...opts.requestAssets, ...existingRoot?.assets ?? []]
          };
        }
      }
      const dehydratedRouter = {
        manifest: manifestToDehydrate,
        matches
      };
      const lastMatchId = matchesToDehydrate[matchesToDehydrate.length - 1]?.id;
      if (lastMatchId) dehydratedRouter.lastMatchId = dehydrateSsrMatchId(lastMatchId);
      const dehydratedData = await router.options.dehydrate?.();
      if (dehydratedData) dehydratedRouter.dehydratedData = dehydratedData;
      _dehydrated = true;
      const trackPlugins = { didRun: false };
      const serializationAdapters = router.options.serializationAdapters;
      const plugins = serializationAdapters ? serializationAdapters.map((t) => /* @__PURE__ */ makeSsrSerovalPlugin(t, trackPlugins)).concat(defaultSerovalPlugins) : defaultSerovalPlugins;
      const signalSerializationComplete = () => {
        _serializationFinished = true;
        try {
          serializationFinishedListeners.forEach((l2) => l2());
          router.emit({ type: "onSerializationFinished" });
        } catch (err) {
          console.error("Serialization listener error:", err);
        } finally {
          serializationFinishedListeners.length = 0;
          renderFinishedListeners.length = 0;
        }
      };
      pn(dehydratedRouter, {
        refs: /* @__PURE__ */ new Map(),
        plugins,
        onSerialize: (data, initial) => {
          let serialized = initial ? TSR_PREFIX + data : data;
          if (trackPlugins.didRun) serialized = P_PREFIX + serialized + P_SUFFIX;
          scriptBuffer.enqueue(serialized);
        },
        onError: (err) => {
          console.error("Serialization error:", err);
          if (err && err.stack) console.error(err.stack);
          signalSerializationComplete();
        },
        scopeId: SCOPE_ID,
        onDone: () => {
          scriptBuffer.enqueue(GLOBAL_TSR + ".e()");
          scriptBuffer.flush();
          signalSerializationComplete();
        }
      });
    },
    isDehydrated() {
      return _dehydrated;
    },
    isSerializationFinished() {
      return _serializationFinished;
    },
    onRenderFinished: (listener) => renderFinishedListeners.push(listener),
    onSerializationFinished: (listener) => serializationFinishedListeners.push(listener),
    setRenderFinished: () => {
      try {
        renderFinishedListeners.forEach((l2) => l2());
      } catch (err) {
        console.error("Error in render finished listener:", err);
      } finally {
        renderFinishedListeners.length = 0;
      }
      scriptBuffer.liftBarrier();
    },
    takeBufferedScripts() {
      const scripts = scriptBuffer.takeAll();
      return {
        tag: "script",
        attrs: {
          nonce: router.options.ssr?.nonce,
          className: "$tsr",
          id: TSR_SCRIPT_BARRIER_ID
        },
        children: scripts
      };
    },
    liftScriptBarrier() {
      scriptBuffer.liftBarrier();
    },
    takeBufferedHtml() {
      if (!injectedHtmlBuffer) return;
      const buffered = injectedHtmlBuffer;
      injectedHtmlBuffer = "";
      return buffered;
    },
    cleanup() {
      if (!router.serverSsr) return;
      renderFinishedListeners.length = 0;
      serializationFinishedListeners.length = 0;
      injectedHtmlBuffer = "";
      scriptBuffer.cleanup();
      router.serverSsr = void 0;
    }
  };
}
function getOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
  }
  return "http://localhost";
}
function getNormalizedURL(url, base) {
  if (typeof url === "string") url = url.replace("\\", "%5C");
  const rawUrl = new URL(url, base);
  const { path: decodedPathname, handledProtocolRelativeURL } = decodePath(rawUrl.pathname);
  const searchParams = new URLSearchParams(rawUrl.search);
  const normalizedHref = decodedPathname + (searchParams.size > 0 ? "?" : "") + searchParams.toString() + rawUrl.hash;
  return {
    url: new URL(normalizedHref, rawUrl.origin),
    handledProtocolRelativeURL
  };
}
function getStartResponseHeaders(opts) {
  return mergeHeaders({ "Content-Type": "text/html; charset=utf-8" }, ...opts.router.stores.matches.get().map((match) => {
    return match.headers;
  }));
}
var entriesPromise;
var baseManifestPromise;
var cachedFinalManifestPromise;
async function loadEntries() {
  const [routerEntry, startEntry, pluginAdapters] = await Promise.all([
    import("./assets/router-BSoNPTDa.js").then((n) => n.a),
    import("./assets/start-HYkvq4Ni.js"),
    import("./assets/__23tanstack-start-plugin-adapters-Cwee5PKy.js")
  ]);
  return {
    routerEntry,
    startEntry,
    pluginAdapters
  };
}
function getEntries() {
  if (!entriesPromise) entriesPromise = loadEntries();
  return entriesPromise;
}
function getBaseManifest(matchedRoutes) {
  if (!baseManifestPromise) baseManifestPromise = getStartManifest();
  return baseManifestPromise;
}
async function resolveManifest(matchedRoutes, transformFn, cache) {
  const base = await getBaseManifest();
  const computeFinalManifest = async () => {
    return transformFn ? await transformManifestAssets(base, transformFn) : buildManifestWithClientEntry(base);
  };
  if (!transformFn || cache) {
    if (!cachedFinalManifestPromise) cachedFinalManifestPromise = computeFinalManifest();
    return cachedFinalManifestPromise;
  }
  return computeFinalManifest();
}
var ROUTER_BASEPATH = "/";
var SERVER_FN_BASE = "/_serverFn/";
var IS_PRERENDERING = process.env.TSS_PRERENDERING === "true";
var IS_SHELL_ENV = process.env.TSS_SHELL === "true";
var ERR_NO_RESPONSE = "Internal Server Error";
var ERR_NO_DEFER = "Internal Server Error";
function throwRouteHandlerError() {
  throw new Error(ERR_NO_RESPONSE);
}
function throwIfMayNotDefer() {
  throw new Error(ERR_NO_DEFER);
}
function isSpecialResponse(value) {
  return value instanceof Response || isRedirect(value);
}
function handleCtxResult(result) {
  if (isSpecialResponse(result)) return { response: result };
  return result;
}
function executeMiddleware(middlewares, ctx) {
  let index = -1;
  const next = async (nextCtx) => {
    if (nextCtx) {
      if (nextCtx.context) ctx.context = safeObjectMerge(ctx.context, nextCtx.context);
      for (const key of Object.keys(nextCtx)) if (key !== "context") ctx[key] = nextCtx[key];
    }
    index++;
    const middleware = middlewares[index];
    if (!middleware) return ctx;
    let result;
    try {
      result = await middleware({
        ...ctx,
        next
      });
    } catch (err) {
      if (isSpecialResponse(err)) {
        ctx.response = err;
        return ctx;
      }
      throw err;
    }
    const normalized = handleCtxResult(result);
    if (normalized) {
      if (normalized.response !== void 0) ctx.response = normalized.response;
      if (normalized.context) ctx.context = safeObjectMerge(ctx.context, normalized.context);
    }
    return ctx;
  };
  return next();
}
function handlerToMiddleware(handler, mayDefer = false) {
  if (mayDefer) return handler;
  return async (ctx) => {
    const response = await handler({
      ...ctx,
      next: throwIfMayNotDefer
    });
    if (!response) throwRouteHandlerError();
    return response;
  };
}
function createStartHandler(cbOrOptions) {
  const cb = typeof cbOrOptions === "function" ? cbOrOptions : cbOrOptions.handler;
  const transformAssetsOption = typeof cbOrOptions === "function" ? void 0 : cbOrOptions.transformAssets;
  const transformAssetUrlsOption = typeof cbOrOptions === "function" ? void 0 : cbOrOptions.transformAssetUrls;
  const transformOption = transformAssetsOption !== void 0 ? resolveTransformAssetsConfig(transformAssetsOption) : transformAssetUrlsOption !== void 0 ? resolveTransformAssetsConfig(adaptTransformAssetUrlsConfigToTransformAssets(transformAssetUrlsOption)) : void 0;
  const warmupTransformManifest = !!transformAssetsOption && typeof transformAssetsOption === "object" && "warmup" in transformAssetsOption && transformAssetsOption.warmup === true || !!transformAssetUrlsOption && typeof transformAssetUrlsOption === "object" && transformAssetUrlsOption.warmup === true;
  const resolvedTransformConfig = transformOption;
  const cache = resolvedTransformConfig ? resolvedTransformConfig.cache : true;
  const shouldCacheCreateTransform = cache && true;
  let cachedCreateTransformPromise;
  const getTransformFn = async (opts) => {
    if (!resolvedTransformConfig) return void 0;
    if (resolvedTransformConfig.type === "createTransform") {
      if (shouldCacheCreateTransform) {
        if (!cachedCreateTransformPromise) cachedCreateTransformPromise = Promise.resolve(resolvedTransformConfig.createTransform(opts)).catch((error) => {
          cachedCreateTransformPromise = void 0;
          throw error;
        });
        return cachedCreateTransformPromise;
      }
      return resolvedTransformConfig.createTransform(opts);
    }
    return resolvedTransformConfig.transformFn;
  };
  if (warmupTransformManifest && cache && true && !cachedFinalManifestPromise) {
    const warmupPromise = (async () => {
      const base = await getBaseManifest();
      const transformFn = await getTransformFn({ warmup: true });
      return transformFn ? await transformManifestAssets(base, transformFn) : buildManifestWithClientEntry(base);
    })();
    cachedFinalManifestPromise = warmupPromise;
    warmupPromise.catch(() => {
      if (cachedFinalManifestPromise === warmupPromise) cachedFinalManifestPromise = void 0;
      cachedCreateTransformPromise = void 0;
    });
  }
  const startRequestResolver = async (request, requestOpts) => {
    let router = null;
    let cbWillCleanup = false;
    try {
      const { url, handledProtocolRelativeURL } = getNormalizedURL(request.url);
      const href = url.pathname + url.search + url.hash;
      const origin = getOrigin(request);
      if (handledProtocolRelativeURL) return Response.redirect(url, 308);
      const entries = await getEntries();
      const startOptions = await entries.startEntry.startInstance?.getOptions() || {};
      const { hasPluginAdapters, pluginSerializationAdapters } = entries.pluginAdapters;
      const serializationAdapters = [
        ...startOptions.serializationAdapters || [],
        ...hasPluginAdapters ? pluginSerializationAdapters : [],
        ServerFunctionSerializationAdapter
      ];
      const requestStartOptions = {
        ...startOptions,
        serializationAdapters
      };
      const flattenedRequestMiddlewares = startOptions.requestMiddleware ? flattenMiddlewares(startOptions.requestMiddleware) : [];
      const executedRequestMiddlewares = new Set(flattenedRequestMiddlewares);
      const getRouter = async () => {
        if (router) return router;
        router = await entries.routerEntry.getRouter();
        let isShell = IS_SHELL_ENV;
        if (IS_PRERENDERING && !isShell) isShell = request.headers.get(HEADERS.TSS_SHELL) === "true";
        const history = createMemoryHistory({ initialEntries: [href] });
        router.update({
          history,
          isShell,
          isPrerendering: IS_PRERENDERING,
          origin: router.options.origin ?? origin,
          defaultSsr: requestStartOptions.defaultSsr,
          serializationAdapters: [...requestStartOptions.serializationAdapters, ...router.options.serializationAdapters || []],
          basepath: ROUTER_BASEPATH
        });
        return router;
      };
      if (SERVER_FN_BASE && url.pathname.startsWith(SERVER_FN_BASE)) {
        const serverFnId = url.pathname.slice(SERVER_FN_BASE.length).split("/")[0];
        if (!serverFnId) throw new Error("Invalid server action param for serverFnId");
        const serverFnHandler = async ({ context }) => {
          return runWithStartContext({
            getRouter,
            startOptions: requestStartOptions,
            contextAfterGlobalMiddlewares: context,
            request,
            executedRequestMiddlewares,
            handlerType: "serverFn"
          }, () => handleServerAction({
            request,
            context: requestOpts?.context,
            serverFnId
          }));
        };
        return handleRedirectResponse((await executeMiddleware([...flattenedRequestMiddlewares.map((d) => d.options.server), serverFnHandler], {
          request,
          pathname: url.pathname,
          context: createNullProtoObject(requestOpts?.context)
        })).response, request, getRouter);
      }
      const executeRouter = async (serverContext, matchedRoutes) => {
        const acceptParts = (request.headers.get("Accept") || "*/*").split(",");
        if (!["*/*", "text/html"].some((mimeType) => acceptParts.some((part) => part.trim().startsWith(mimeType)))) return Response.json({ error: "Only HTML requests are supported here" }, { status: 500 });
        const manifest2 = await resolveManifest(matchedRoutes, await getTransformFn({
          warmup: false,
          request
        }), cache);
        const routerInstance = await getRouter();
        attachRouterServerSsrUtils({
          router: routerInstance,
          manifest: manifest2,
          getRequestAssets: () => getStartContext({ throwIfNotFound: false })?.requestAssets,
          includeUnmatchedRouteAssets: false
        });
        routerInstance.update({ additionalContext: { serverContext } });
        await routerInstance.load();
        if (routerInstance.state.redirect) return routerInstance.state.redirect;
        const ctx = getStartContext({ throwIfNotFound: false });
        await routerInstance.serverSsr.dehydrate({ requestAssets: ctx?.requestAssets });
        const responseHeaders = getStartResponseHeaders({ router: routerInstance });
        cbWillCleanup = true;
        return cb({
          request,
          router: routerInstance,
          responseHeaders
        });
      };
      const requestHandlerMiddleware = async ({ context }) => {
        return runWithStartContext({
          getRouter,
          startOptions: requestStartOptions,
          contextAfterGlobalMiddlewares: context,
          request,
          executedRequestMiddlewares,
          handlerType: "router"
        }, async () => {
          try {
            return await handleServerRoutes({
              getRouter,
              request,
              url,
              executeRouter,
              context,
              executedRequestMiddlewares
            });
          } catch (err) {
            if (err instanceof Response) return err;
            throw err;
          }
        });
      };
      return handleRedirectResponse((await executeMiddleware([...flattenedRequestMiddlewares.map((d) => d.options.server), requestHandlerMiddleware], {
        request,
        pathname: url.pathname,
        context: createNullProtoObject(requestOpts?.context)
      })).response, request, getRouter);
    } finally {
      if (router && !cbWillCleanup) router.serverSsr?.cleanup();
      router = null;
    }
  };
  return requestHandler(startRequestResolver);
}
async function handleRedirectResponse(response, request, getRouter) {
  if (!isRedirect(response)) return response;
  if (isResolvedRedirect(response)) {
    if (request.headers.get("x-tsr-serverFn") === "true") return Response.json({
      ...response.options,
      isSerializedRedirect: true
    }, { headers: response.headers });
    return response;
  }
  const opts = response.options;
  if (opts.to && typeof opts.to === "string" && !opts.to.startsWith("/")) throw new Error(`Server side redirects must use absolute paths via the 'href' or 'to' options. The redirect() method's "to" property accepts an internal path only. Use the "href" property to provide an external URL. Received: ${JSON.stringify(opts)}`);
  if ([
    "params",
    "search",
    "hash"
  ].some((d) => typeof opts[d] === "function")) throw new Error(`Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(opts).filter((d) => typeof opts[d] === "function").map((d) => `"${d}"`).join(", ")}`);
  const redirect2 = (await getRouter()).resolveRedirect(response);
  if (request.headers.get("x-tsr-serverFn") === "true") return Response.json({
    ...response.options,
    isSerializedRedirect: true
  }, { headers: response.headers });
  return redirect2;
}
async function handleServerRoutes({ getRouter, request, url, executeRouter, context, executedRequestMiddlewares }) {
  const router = await getRouter();
  const pathname = executeRewriteInput(router.rewrite, url).pathname;
  const { matchedRoutes, foundRoute, routeParams } = router.getMatchedRoutes(pathname);
  const isExactMatch = foundRoute && routeParams["**"] === void 0;
  const routeMiddlewares = [];
  for (const route of matchedRoutes) {
    const serverMiddleware = route.options.server?.middleware;
    if (serverMiddleware) {
      const flattened = flattenMiddlewares(serverMiddleware);
      for (const m2 of flattened) if (!executedRequestMiddlewares.has(m2)) routeMiddlewares.push(m2.options.server);
    }
  }
  const server2 = foundRoute?.options.server;
  if (server2?.handlers && isExactMatch) {
    const handlers = typeof server2.handlers === "function" ? server2.handlers({ createHandlers: (d) => d }) : server2.handlers;
    const handler = handlers[request.method.toUpperCase()] ?? handlers["ANY"];
    if (handler) {
      const mayDefer = !!foundRoute.options.component;
      if (typeof handler === "function") routeMiddlewares.push(handlerToMiddleware(handler, mayDefer));
      else {
        if (handler.middleware?.length) {
          const handlerMiddlewares = flattenMiddlewares(handler.middleware);
          for (const m2 of handlerMiddlewares) routeMiddlewares.push(m2.options.server);
        }
        if (handler.handler) routeMiddlewares.push(handlerToMiddleware(handler.handler, mayDefer));
      }
    }
  }
  routeMiddlewares.push((ctx) => executeRouter(ctx.context, matchedRoutes));
  return (await executeMiddleware(routeMiddlewares, {
    request,
    context,
    params: routeParams,
    pathname
  })).response;
}
const fetch$1 = createStartHandler(defaultStreamHandler);
function createServerEntry(entry) {
  return {
    async fetch(...args) {
      return await entry.fetch(...args);
    }
  };
}
const server = createServerEntry({ fetch: fetch$1 });
export {
  TSS_SERVER_FUNCTION as T,
  createServerFn as c,
  createServerEntry,
  server as default,
  getServerFnById as g
};
