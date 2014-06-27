// no se puede usar npm install como normalmente se haria
// porque hay que modificar la libreria con nuestra propia version
var argyle = require('./lib/argyle/index.js');

// este archivo NO esta en el repo
var xploit = require('./xploit.js');


var express = require('express')
  , url = require('url');

var path = require('path')
  , url = require('url');

var app = express();

var localPort = 8080;

var proxy = function (urlString) {
  var parsedUrl = url.parse(urlString);
  var httpLib = parsedUrl.protocol === 'https:' ? 'https' : 'http';
  var request = require(httpLib).request;

  return function (req, resp, next) {
    var myReq = request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: req.method,
      headers: req.headers,
    }, function (myRes) {
      resp.writeHead(myRes.statusCode, myRes.headers);
      myRes.pipe(resp);
    });
    req.on('error', function(err) {
      next(err);
    });
    req.pipe(myReq);
  };
};

var multipleTargetProxy = function(req, resp, next) {
};

var messagePage = function(req, resp) {
  resp.writeHead(200, {"Content-Type": "text/plain"});
  resp.end("Esto no es un proxy todavia, es una prueba de que se puede interceptar requests\n");
};

app.get('/', messagePage);
app.post('/', messagePage);

app.listen(localPort);


// este es un proxy socks5 normal
var server = argyle(8888, '0.0.0.0');

server.hostPortFilter = function(host, port) {
  if (xploit.target.host === host && xploit.target.port === port) {
    return {host: '127.0.0.1', port: localPort}
  }
};


server.on('connected', function(req, dest) {
    req.pipe(dest);
    dest.pipe(req);
});

