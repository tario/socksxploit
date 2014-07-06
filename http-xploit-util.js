var zlib = require("zlib");

module.exports = {
  wrapResponse: function(res, changeData, shouldIntercept) {
    var fullResponse = new Buffer([]);
    var resHeaders = {};

    return {
      setHeader: function(name, value) {
        resHeaders[name] = value;
        res.setHeader(name, value);
      },
      writeHead: res.writeHead.bind(res),
      on: res.on.bind(res),
      once: res.once.bind(res),
      emit: res.emit.bind(res),
      write: function(data) {
        fullResponse = Buffer.concat([fullResponse, data]);
      },
      end: function() {
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

      },
      removeListener: res.removeListener.bind(res),
    };
  }
};

