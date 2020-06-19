/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module defines the RAPID client which is responsible for all HTTP
 * interactions with the RAPID layer.
 */

"use strict";

const Errors = require("./Errors");
const XRayError = require("./XRayError");
const ERROR_TYPE_HEADER = "Lambda-Runtime-Function-Error-Type";

/**
 * Objects of this class are responsible for all interactions with the RAPID
 * API.
 */
module.exports = class RAPIDClient {
  constructor(hostnamePort, httpClient, nativeClient) {
    this.http = httpClient || require("http");
    this.nativeClient =
      nativeClient || require("/opt/aws/build/Release/rapid-client.node");

    let [hostname, port] = hostnamePort.split(":");
    this.hostname = hostname;
    this.port = parseInt(port, 10);
    this.agent = new this.http.Agent({
      keepAlive: true,
      maxSockets: 1
    });
  }

  /**
   * Complete and invocation with the provided response.
   * @param {Object} response
   *   An arbitrary object to convert to JSON and send back as as response.
   * @param {String} id
   *   The invocation ID.
   * @param (function()} callback
   *   The callback to run after the POST response ends
   */
  postInvocationResponse(response, id, callback) {
    let bodyString = _trySerializeResponse(response);
    this.nativeClient.done(id, bodyString);
    callback();
  }

  /**
   * Post an initialization error to the RAPID API.
   * @param {Error} error
   * @param (function()} callback
   *   The callback to run after the POST response ends
   */
  postInitError(error, callback) {
    let response = Errors.toRapidResponse(error);
    this._post(
      `/2018-06-01/runtime/init/error`,
      response,
      { [ERROR_TYPE_HEADER]: response.errorType },
      callback
    );
  }

  /**
   * Post an invocation error to the RAPID API
   * @param {Error} error
   * @param {String} id
   *   The invocation ID for the in-progress invocation.
   * @param (function()} callback
   *   The callback to run after the POST response ends
   */
  postInvocationError(error, id, callback) {
    let response = Errors.toRapidResponse(error);
    let bodyString = _trySerializeResponse(response);
    let xrayString = XRayError.formatted(error);
    this.nativeClient.error(id, bodyString, xrayString);
    callback();
  }

  /**
   * Get the next invocation.
   * @return {PromiseLike.<Object>}
   *   A promise which resolves to an invocation object that contains the body
   *   as json and the header array. e.g. {bodyJson, headers}
   */
  async nextInvocation() {
    return this.nativeClient.next();
  }

  /**
   * HTTP Post to a path.
   * @param {String} path
   * @param {Object} body
   *   The body is serialized into JSON before posting.
   * @param {Object} headers
   *   The http headers
   * @param (function()} callback
   *   The callback to run after the POST response ends
   */
  _post(path, body, headers, callback) {
    let bodyString = _trySerializeResponse(body);
    let options = {
      hostname: this.hostname,
      port: this.port,
      path: path,
      method: "POST",
      headers: Object.assign(
        {
          "Content-Type": "application/json",
          "Content-Length": Buffer.from(bodyString).length
        },
        headers || {}
      ),
      agent: this.agent
    };
    let request = this.http.request(options, response => {
      response.on("end", () => {
        callback();
      });
      response.on("error", e => {
        throw e;
      });
      response.on("data", () => {});
    });
    request.on("error", e => {
      throw e;
    });
    request.end(bodyString, "utf-8");
  }
};

/**
 * Attempt to serialize an object as json. Capture the failure if it occurs and
 * throw one that's known to be serializable.
 */
function _trySerializeResponse(body) {
  try {
    return JSON.stringify(body === undefined ? null : body);
  } catch (err) {
    throw new Error("Unable to stringify response body");
  }
}
