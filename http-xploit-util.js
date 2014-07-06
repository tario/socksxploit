var zlib = require("zlib");

module.exports = {
  wrapResponse: function(res, changeData, shouldIntercept) {
    var fullResponse = new Buffer([]);
    var resHeaders = {};
    var shouldInterceptThisRequest = false;

    var interceptWrite = function(data) {
      fullResponse = Buffer.concat([fullResponse, data]);
    };

    var interceptEnd = function() {
      if (shouldIntercept(resHeaders)) {
        if (resHeaders["content-encoding"] === "gzip") {
          zlib.gunzip(fullResponse, function(err, buffer) {
            buffer = changeData(buffer);
            zlib.gzip(buffer, function(err, compressed) {
              res.write(compressed);
              res.end();
            });
          });
        } else {
          fullResponse = changeData(fullResponse);
          res.write(fullResponse);
          res.end();
        }
      } else {
        res.write(fullResponse);
        res.end();
      }

    };

    return {
      setHeader: function(name, value) {
        resHeaders[name] = value;
        if (shouldIntercept(resHeaders)) {
          this.write = interceptWrite;
          this.end = interceptEnd;
        }
        res.setHeader(name, value);
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

