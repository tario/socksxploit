var zlib = require("zlib");

module.exports = {
  wrapResponse: function(res, changeData, shouldIntercept) {
    var fullResponse = new Buffer([]);
    var resHeaders = {};
    var shouldInterceptThisRequest = false;

    var writeHeadArgs;

    var interceptWrite = function(data) {
      fullResponse = Buffer.concat([fullResponse, data]);
    };

    var sendHeaders = function() {
      for (var headerName in resHeaders) {
        res.setHeader(headerName, resHeaders[headerName]);
      }
      res.writeHead(writeHeadArgs.statusCode, writeHeadArgs.reason, writeHeadArgs.headers);
    };

    var interceptEnd = function() {
      if (shouldIntercept(resHeaders)) {
        if (resHeaders["content-encoding"] === "gzip") {
          zlib.gunzip(fullResponse, function(err, buffer) {
            buffer = changeData(buffer);
            zlib.gzip(buffer, function(err, compressed) {
              resHeaders["content-length"] = compressed.length;
              sendHeaders();
              res.write(compressed);
              res.end();
            });
          });
        } else {
          fullResponse = changeData(fullResponse);
          resHeaders["content-length"] = fullResponse.length;
                    console.log("actual content length: " + fullResponse.length);
          sendHeaders();
          res.write(fullResponse);
          res.end();
        }
      } else {
        resHeaders["content-length"] = fullResponse.length;
        sendHeaders();
        res.write(fullResponse);
        res.end();
      }

    };

    var interceptWriteHead = function(statusCode, reason, headers) {
      writeHeadArgs = {statusCode: statusCode, reason: reason, headers: headers};
    };

    return {
      setHeader: function(name, value) {
        resHeaders[name] = value;
        if (shouldIntercept(resHeaders)) {
          this.write = interceptWrite;
          this.end = interceptEnd;
          this.writeHead = interceptWriteHead;
        }

        res.setHeader(name, value);
        if (name === "content-length") {
          console.log("original content length: " + value);
        }
      },
      writeHead: res.writeHead.bind(res),
      on: res.on.bind(res),
      once: res.once.bind(res),
      emit: res.emit.bind(res),
      write: res.write.bind(res),
      end: res.end.bind(res),
      removeListener: res.removeListener.bind(res),
    };
  }
};

