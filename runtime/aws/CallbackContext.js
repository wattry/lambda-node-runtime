/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 */
"use strict";

let BeforeExitListener = require("./BeforeExitListener.js");
let Errors = require("./Errors");

function _homogeneousError(err) {
  if (err instanceof Error) {
    return err;
  } else {
    return new Error(err);
  }
}

/**
 * Build the callback function and the part of the context which exposes
 * the succeed/fail/done callbacks.
 * @param client {Client}
 *   The RAPID client used to post results/errors.
 * @param id {string}
 *   The invokeId for the current invocation.
 * @param scheduleNext {function}
 *   A function which takes no params and immediately schedules the next
 *   iteration of the invoke loop.
 */
function _rawCallbackContext(client, id, scheduleNext) {
  const postError = (err, callback) => {
    console.error("Invoke Error", Errors.toFormatted(_homogeneousError(err)));
    client.postInvocationError(err, id, callback);
  };
  const complete = (result, callback) => {
    client.postInvocationResponse(result, id, callback);
  };

  let waitForEmptyEventLoop = true;

  let callback = function(err, result) {
    BeforeExitListener.reset();
    if (err !== undefined && err !== null) {
      postError(err, scheduleNext);
    } else {
      complete(result, () => {
        if (!waitForEmptyEventLoop) {
          scheduleNext();
        } else {
          BeforeExitListener.set(scheduleNext);
        }
      });
    }
  };

  let done = (err, result) => {
    BeforeExitListener.reset();
    if (err !== undefined && err !== null) {
      postError(err, scheduleNext);
    } else {
      complete(result, scheduleNext);
    }
  };
  let succeed = result => {
    done(null, result);
  };
  let fail = err => {
    if (err === undefined || err === null) {
      done("handled");
    } else {
      done(err, null);
    }
  };

  let callbackContext = {
    get callbackWaitsForEmptyEventLoop() {
      return waitForEmptyEventLoop;
    },
    set callbackWaitsForEmptyEventLoop(value) {
      waitForEmptyEventLoop = value;
    },
    succeed: succeed,
    fail: fail,
    done: done
  };

  return [callback, callbackContext];
}

/**
 * Wraps the callback and context so that only the first call to any callback
 * succeeds.
 * @param callback {function}
 *   the node-style callback function that was previously generated but not
 *   yet wrapped.
 * @param callbackContext {object}
 *   The previously generated callbackContext object that contains
 *   getter/setters for the contextWaitsForEmptyeventLoop flag and the
 *   succeed/fail/done functions.
 * @return [callback, context]
 */
function _wrappedCallbackContext(callback, callbackContext) {
  let finished = false;
  let onlyAllowFirstCall = function(toWrap) {
    return function() {
      if (!finished) {
        toWrap.apply(null, arguments);
        finished = true;
      }
    };
  };

  callbackContext.succeed = onlyAllowFirstCall(callbackContext.succeed);
  callbackContext.fail = onlyAllowFirstCall(callbackContext.fail);
  callbackContext.done = onlyAllowFirstCall(callbackContext.done);

  return [onlyAllowFirstCall(callback), callbackContext];
}

/**
 * Construct the base-context object which includes the required flags and
 * callback methods for the Node programming model.
 * @param client {Client}
 *   The RAPID client used to post results/errors.
 * @param id {string}
 *   The invokeId for the current invocation.
 * @param scheduleNext {function}
 *   A function which takes no params and immediately schedules the next
 *   iteration of the invoke loop.
 * @return [callback, context]
 *   The same function and context object, but wrapped such that only the
 *   first call to any function will be successful. All subsequent calls are
 *   a no-op.
 */
module.exports.build = function(client, id, scheduleNext) {
  let rawCallbackContext = _rawCallbackContext(client, id, scheduleNext);
  return _wrappedCallbackContext(...rawCallbackContext);
};
